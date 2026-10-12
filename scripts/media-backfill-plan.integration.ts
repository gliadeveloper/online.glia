import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { buildBackfillPlan } from "./media-audit/backfill-plan";
import { configHash } from "./media-audit/references";
import type { AuditConfig, Inventory, Snapshot } from "./media-audit/types";

type Check = (name: string, work: () => Promise<unknown>) => Promise<void>;
const execute = promisify(execFile);
function fixture() {
  const key = "courses/c/lessons/l/images/file.png", physical = "bucket/" + key;
  const config: AuditConfig = { appOrigin: "https://app.example.invalid", keyAliases: [{ urlKey: key, bucket: "fixture", objectKey: physical }] };
  const snapshot: Snapshot = { version: 1, startedAt: "2026-10-09T00:00:00Z", finishedAt: "2026-10-09T00:00:01Z", databaseSnapshot: "fixture", configHash: configHash(config), mediaSchema: "ABSENT", assets: [], files: [], usages: [],
    sources: [{ source: "contents:c", target: { contentId: "c" }, bodyVersion: "a".repeat(64), editorCandidateIds: ["current-editor-not-owner"], groups: [[{ key }, { key }], [{ key }, { key }]], possibleKeys: [] }],
    contexts: { lessons: [{ id: "l", courseId: "c", editorId: "current-editor-not-owner" }], sessions: [] }, coverage: { scanned: [], excludedTables: ["audit_logs"], unknownColumns: [] }, issues: [] };
  const inventory: Inventory = { version: 1, bucket: "fixture", prefix: "", startedAt: snapshot.startedAt, finishedAt: snapshot.finishedAt, complete: true, objects: [{ key: physical, size: "42", etag: '"observation-only"' }] };
  return { key, physical, config, snapshot, inventory };
}

export async function runMediaBackfillPlanIntegration(check: Check) {
  await check("backfill plan: mirrored representations preserve occurrence counts without assigning ownership", async () => {
    const f = fixture(); const plan = buildBackfillPlan(f.snapshot, f.inventory, f.config); const item = plan.entries[0];
    assert.equal(item.decision, "REVIEW_FOR_REGISTRATION");
    assert.equal(item.objectKey, f.physical); assert.deepEqual(item.urlKeys, [f.key]);
    assert.equal(item.expectedUsages[0].occurrenceCount, 2); assert.equal(item.expectedUsages[0].expectedBodyVersion, "a".repeat(64));
    assert.deepEqual(item.proposedAsset, { layout: "LEGACY", scope: "UNCLASSIFIED", ownerUserId: null, retentionHold: null });
    assert.equal(item.applyAllowed, false); assert.equal(item.deletionAllowed, false);
    assert(!JSON.stringify(item).includes("verifiedAt")); assert(!JSON.stringify(item).includes("current-editor-not-owner"));
  });
  await check("backfill plan: one physical object retains separate course and coaching usages", async () => {
    const f = fixture(); f.snapshot.sources.push({ ...f.snapshot.sources[0], source: "coaching_sessions:s", target: { coachingSessionId: "s" }, groups: [[{ key: f.key }]] });
    const plan = buildBackfillPlan(f.snapshot, f.inventory, f.config);
    assert.equal(plan.entries.length, 1); assert.equal(plan.summary.expectedUsageRows, 2);
    assert.deepEqual(plan.entries[0].expectedUsages.map(u => u.occurrenceCount).sort(), [1, 2]);
  });
  await check("backfill plan: unreferenced and possible-only files are preserved without manufactured usages", async () => {
    const f = fixture(); f.snapshot.sources = [];
    assert.equal(buildBackfillPlan(f.snapshot, f.inventory, f.config).entries[0].decision, "PRESERVE_UNREFERENCED");
    f.snapshot.sources = [{ source: "contents:c", target: { contentId: "c" }, groups: [], possibleKeys: [f.key], editorCandidateIds: [] }];
    const item = buildBackfillPlan(f.snapshot, f.inventory, f.config).entries[0];
    assert.equal(item.decision, "REVIEW_POSSIBLE_REFERENCE"); assert.equal(item.expectedUsages.length, 0); assert(item.proposedAsset?.retentionHold);
  });
  await check("backfill plan: external consumers need access review, hold alone does not authorize import", async () => {
    const f = fixture(); f.snapshot.sources.push({ source: "products:p", groups: [[{ key: f.key }]], possibleKeys: [], editorCandidateIds: [] });
    const item = buildBackfillPlan(f.snapshot, f.inventory, f.config).entries[0];
    assert.equal(item.decision, "REVIEW_EXTERNAL_CONSUMER"); assert(item.reviews.includes("EXTERNAL_ACCESS_POLICY_REQUIRED"));
    assert(item.proposedAsset?.retentionHold); assert.equal(item.applyAllowed, false);
    const other = "community/u/images/image.png"; f.inventory.objects.push({ key: other, size: "20" });
    assert.equal(buildBackfillPlan(f.snapshot, f.inventory, f.config).entries.find(e => e.objectKey === other)?.decision, "PRESERVE_OUTSIDE_SCOPE");
  });
  await check("backfill plan: missing objects and source versions block registration; incomplete inputs fail", async () => {
    const f = fixture(); f.inventory.objects = [];
    assert.equal(buildBackfillPlan(f.snapshot, f.inventory, f.config).entries[0].decision, "BLOCKED_MISSING_OBJECT");
    assert.throws(() => buildBackfillPlan(f.snapshot, { ...f.inventory, complete: false }, f.config), /BACKFILL_INPUT_INCOMPLETE/);
    assert.throws(() => buildBackfillPlan({ ...f.snapshot, mediaSchema: "PARTIAL" }, f.inventory, f.config), /BACKFILL_INPUT_INCOMPLETE/);
    f.inventory.objects = [{ key: f.physical, size: "42" }]; delete f.snapshot.sources[0].bodyVersion;
    assert(buildBackfillPlan(f.snapshot, f.inventory, f.config).entries[0].reviews.includes("SOURCE_VERSION_REQUIRED"));
  });
  await check("backfill plan: aliases of one object require a URL policy and coverage findings stay visible", async () => {
    const f = fixture(); f.config.keyAliases!.push({ urlKey: "coaching/s/images/other.png", bucket: "fixture", objectKey: f.physical }); f.snapshot.configHash = configHash(f.config);
    f.snapshot.coverage.unknownColumns.push("contents.futureMedia"); f.snapshot.issues.push({ code: "SOURCE_COVERAGE_REVIEW_REQUIRED" });
    const plan = buildBackfillPlan(f.snapshot, f.inventory, f.config);
    assert.equal(plan.entries.length, 1); assert(plan.entries[0].reviews.includes("MULTIPLE_URL_KEYS_REQUIRE_MAPPING_POLICY"));
    assert.deepEqual(plan.coverageReview.unknownColumns, ["contents.futureMedia"]); assert.equal(plan.applyAllowed, false);
    assert.throws(() => buildBackfillPlan(f.snapshot, f.inventory, { appOrigin: f.config.appOrigin }), /AUDIT_CONFIG_MISMATCH/);
  });
  await check("backfill plan: registered objects are reused without proposing duplicate assets", async () => {
    const f = fixture(); f.snapshot.mediaSchema = "PRESENT";
    f.snapshot.assets.push({ id: "asset", scope: "PERSONAL", ownerUserId: "owner", layout: "LEGACY", storageStatus: "READY", libraryStatus: "ACTIVE", retentionHold: false });
    f.snapshot.files.push({ id: "file", assetId: "asset", bucket: "fixture", objectKey: f.physical, urlKey: f.key, status: "READY", role: "ORIGINAL", byteSize: "42", verified: true });
    const item = buildBackfillPlan(f.snapshot, f.inventory, f.config).entries[0];
    assert.equal(item.decision, "KEEP_REGISTERED"); assert.equal(item.registeredAssetId, "asset"); assert.equal(item.proposedAsset, null);
  });
  await check("backfill plan: offline CLI writes private evidence and refuses overwriting or apply flags", async () => {
    const f = fixture(), dir = await mkdtemp(path.join(os.tmpdir(), "media-plan-test-"));
    try {
      for (const name of ["config", "snapshot", "inventory"] as const) await writeFile(path.join(dir, name + ".json"), JSON.stringify(f[name]));
      const args = ["--conditions=react-server", "--import", "tsx", "scripts/media-backfill-plan.ts", "--config", path.join(dir, "config.json"), "--snapshot", path.join(dir, "snapshot.json"), "--inventory", path.join(dir, "inventory.json"), "--out", path.join(dir, "result")];
      const options = { cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), timeout: 30000 };
      const result = await execute(process.execPath, args, options); assert.equal(JSON.parse(result.stdout).applyAllowed, false);
      assert.equal((await stat(path.join(dir, "result"))).mode & 0o777, 0o700);
      assert.equal((await stat(path.join(dir, "result/plan.private.json"))).mode & 0o777, 0o600);
      assert(JSON.parse(await readFile(path.join(dir, "result/manifest.json"), "utf8")).complete);
      await assert.rejects(execute(process.execPath, args, options));
      await assert.rejects(execute(process.execPath, [...args, "--apply"], options));
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
}
