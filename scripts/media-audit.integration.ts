import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import type { Client } from "pg";
import { S3Client, type ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { mediaBodyVersion } from "../src/lib/media/body-version";
import { readSnapshot } from "./media-audit/database";
import { readInventory } from "./media-audit/storage";
import { configHash, inspectSource, validateConfig } from "./media-audit/references";
import { reconcile } from "./media-audit/reconcile";
import type { AuditConfig, Inventory, Snapshot } from "./media-audit/types";

type Check = (name: string, work: () => Promise<unknown>) => Promise<void>;
const cfg: AuditConfig = { appOrigin: "https://app.example.invalid", publicBaseUrl: "https://media.example.invalid" };
const now = "2026-10-07T00:00:00.000Z";
const proxy = (key: string) => `/api/media/r2?key=${encodeURIComponent(key)}`;
const image = (key: string) => `![x](${proxy(key)})`;
function fixture() {
  const key = "courses/course/lessons/lesson/images/shared.png";
  const snapshot: Snapshot = {
    version: 1, startedAt: now, finishedAt: now, databaseSnapshot: "fixture", configHash: configHash(cfg), mediaSchema: "PRESENT",
    assets: [{ id: "shared", scope: "SHARED", ownerUserId: null, layout: "LEGACY", libraryStatus: "ACTIVE", storageStatus: "READY", retentionHold: false }],
    files: [{ id: "original", assetId: "shared", bucket: "fixture", objectKey: key, urlKey: key, role: "ORIGINAL", status: "READY", verified: true, byteSize: "100" }],
    sources: [], usages: [], contexts: { lessons: [{ id: "lesson", courseId: "course", editorId: "coach" }], sessions: [] },
    coverage: { scanned: [], excludedTables: [], unknownColumns: [] }, issues: [],
  };
  const inventory: Inventory = { version: 1, bucket: "fixture", prefix: "", complete: true, startedAt: now, finishedAt: now, objects: [{ key, size: "100" }] };
  return { key, snapshot, inventory };
}

export async function runMediaAuditBeforeMigration(db: Client, check: Check) {
  await check("audit: pre-migration database is readable without creating media tables", async () => {
    const before = (await db.query("SELECT count(*) FROM pg_tables WHERE tablename LIKE 'media_%'")).rows;
    const snapshot = await readSnapshot(db, cfg, { pageSize: 1, maxRows: 1000, maxBytes: 1024 * 1024 });
    assert.equal(snapshot.mediaSchema, "ABSENT");
    assert(snapshot.sources.some(row => row.target && "contentId" in row.target && row.target.contentId === "c"));
    assert(snapshot.sources.some(row => row.target && "coachingSessionId" in row.target && row.target.coachingSessionId === "s"));
    assert.deepEqual((await db.query("SELECT count(*) FROM pg_tables WHERE tablename LIKE 'media_%'")).rows, before);
    assert.equal(JSON.stringify(snapshot).includes("Existing coaching body"), false, "body is not exported");
    assert.equal(JSON.stringify(snapshot).includes("owner@example.invalid"), false, "email is not exported");
  });
  await check("audit: partially installed media schema is explicitly marked incomplete", async () => {
    await db.query("CREATE TABLE media_assets(id text PRIMARY KEY)");
    try {
      const snapshot = await readSnapshot(db, cfg);
      assert.equal(snapshot.mediaSchema, "PARTIAL");
      assert(snapshot.issues.some(i => i.code === "PARTIAL_MEDIA_SCHEMA"));
    } finally { await db.query("DROP TABLE media_assets"); }
  });
}

export async function runMediaAuditIntegration(db: Client, check: Check, openClient: () => Promise<Client>) {
  await check("audit: post-migration schema and sources are read, database rows remain unchanged", async () => {
    const counts = async () => (await db.query("SELECT (SELECT count(*) FROM media_assets)::text AS assets, (SELECT count(*) FROM media_usages)::text AS usages, (SELECT count(*) FROM audit_logs)::text AS audits")).rows;
    const before = await counts();
    const snapshot = await readSnapshot(db, cfg, { pageSize: 7, maxRows: 10000, maxBytes: 16 * 1024 * 1024 });
    assert.equal(snapshot.mediaSchema, "PRESENT");
    assert(snapshot.assets.length > 0);
    for (const table of ["lesson_materials", "products", "posts", "discussions", "profiles", "coaching_session_messages"]) assert(snapshot.coverage.scanned.some(row => row.table === table));
    assert.deepEqual(await counts(), before);
    assert(!JSON.stringify(snapshot).includes('"password"'));
    assert(!JSON.stringify(snapshot).includes('"tokenHash"'));
  });
  await check("audit: enforced read-only transaction rejects an injected write", async () => {
    const wrapped = { query: async (sql: string, values?: unknown[]) => {
      if (sql.startsWith("SELECT txid_current_snapshot")) await db.query("UPDATE contents SET body='must-not-write' WHERE id='c'");
      return db.query(sql, values);
    } } as unknown as Client;
    await assert.rejects(readSnapshot(wrapped, cfg), (error: unknown) => (error as { code?: string }).code === "25006");
    assert.notEqual((await db.query("SELECT body FROM contents WHERE id='c'")).rows[0].body, "must-not-write");
  });
  await check("audit: pagination uses one consistent database snapshot during a concurrent edit", async () => {
    const original = (await db.query("SELECT body,url,metadata FROM contents WHERE id='c'")).rows[0];
    const writer = await openClient();
    let changed = false;
    const wrapped = { query: async (sql: string, values?: unknown[]) => {
      const response = await db.query(sql, values);
      if (!changed && sql.includes('FROM public."courses"')) {
        changed = true;
        await writer.query("UPDATE contents SET body='Concurrent audit edit' WHERE id='c'");
      }
      return response;
    } } as unknown as Client;
    try {
      const snapshot = await readSnapshot(wrapped, cfg, { pageSize: 1, maxRows: 10000, maxBytes: 16 * 1024 * 1024 });
      assert(changed);
      assert.equal(snapshot.sources.find(row => row.source === "contents:c")?.bodyVersion, await mediaBodyVersion(original));
      assert.equal((await writer.query("SELECT body FROM contents WHERE id='c'")).rows[0].body, "Concurrent audit edit");
    } finally {
      await writer.query("UPDATE contents SET body=$1 WHERE id='c'", [original.body]);
      await writer.end();
    }
  });
  await check("audit: scan limits fail explicitly and close the transaction", async () => {
    await assert.rejects(readSnapshot(db, cfg, { pageSize: 1, maxRows: 1, maxBytes: 10000 }), /DATABASE_SCAN_LIMIT/);
    assert.equal((await db.query("SELECT current_setting('transaction_read_only') AS value")).rows[0].value, "off");
  });
  await check("audit: newly added media-bearing field is reported as uncovered", async () => {
    await db.query('ALTER TABLE courses ADD COLUMN "futureMediaUrl" text');
    try {
      const snapshot = await readSnapshot(db, cfg);
      assert(snapshot.coverage.unknownColumns.includes("courses.futureMediaUrl"));
      assert(snapshot.issues.some(i => i.code === "SOURCE_COVERAGE_REVIEW_REQUIRED"));
    } finally { await db.query('ALTER TABLE courses DROP COLUMN "futureMediaUrl"'); }
  });
  await check("audit: row-level visibility rules prevent an unqualified coverage claim", async () => {
    await db.query("ALTER TABLE contents ENABLE ROW LEVEL SECURITY");
    try {
      const snapshot = await readSnapshot(db, cfg);
      assert(snapshot.issues.some(i => i.code === "RLS_VISIBILITY_REVIEW_REQUIRED" && i.source === "contents"));
    } finally { await db.query("ALTER TABLE contents DISABLE ROW LEVEL SECURITY"); }
  });
  await check("audit: active unreferenced asset is stored library material, never deletion eligible", async () => {
    const { snapshot, inventory } = fixture();
    const report = reconcile(snapshot, inventory, cfg);
    assert.equal(report.objects[0].observedClass, "LIBRARY_STORED");
    assert.equal(report.objects[0].deletionEligible, false);
    assert.equal(report.deletionAuthorized, false);
  });
  await check("audit: mirrored body uses max occurrence count and reports missing usage", async () => {
    const { key, snapshot, inventory } = fixture();
    snapshot.sources.push(await inspectSource("contents:c", { body: image(key), metadata: { blocknote: { blocks: [{ type: "image", props: { url: proxy(key) } }] } } }, cfg, snapshot.issues, { contentId: "c" }, ["coach"]));
    const report = reconcile(snapshot, inventory, cfg);
    assert.deepEqual(report.usageDifferences, [{ code: "USAGE_MISSING", source: "contents:c", assetId: "shared", actual: 0, expected: 1 }]);
    assert.equal(report.objects[0].possibleReferences.length, 0, "Markdown delimiters must not fabricate extra keys");
    snapshot.usages.push({ assetId: "shared", contentId: "c", coachingSessionId: null, occurrenceCount: 1 });
    assert.equal(reconcile(snapshot, inventory, cfg).usageDifferences.length, 0);
  });
  await check("audit: stale usage/count mismatch is reported, not deleted", async () => {
    const { snapshot, inventory } = fixture();
    snapshot.usages.push({ assetId: "shared", contentId: "c", coachingSessionId: null, occurrenceCount: 2 });
    assert.equal(reconcile(snapshot, inventory, cfg).usageDifferences[0].code, "USAGE_NOT_IN_PARSED_BODY");
    snapshot.sources.push({ source: "contents:c", target: { contentId: "c" }, groups: [[{ assetId: "shared" }]], possibleKeys: [], editorCandidateIds: [] });
    assert.equal(reconcile(snapshot, inventory, cfg).usageDifferences[0].code, "USAGE_COUNT_MISMATCH");
  });
  await check("audit: out-of-scope consumers recommend hold on an otherwise shared asset", async () => {
    const { key, snapshot, inventory } = fixture();
    snapshot.sources.push(await inspectSource("products:p:description", { body: image(key) }, cfg, snapshot.issues));
    const object = reconcile(snapshot, inventory, cfg).objects[0];
    assert(object.flags.includes("OUTSIDE_CONTENT_CONSUMER"));
    assert(object.flags.includes("HOLD_RECOMMENDED"));
  });
  await check("audit: legacy path gives editor candidates but never assigns ownership", async () => {
    const { snapshot, inventory } = fixture();
    snapshot.files = []; snapshot.assets = [];
    const object = reconcile(snapshot, inventory, cfg).objects[0];
    assert.deepEqual(object.editorCandidateIds, ["coach"]);
    assert.equal(object.ownershipConfirmed, false);
    assert.equal(object.ownerUserId, null);
    assert(object.flags.includes("OWNER_UNCONFIRMED"));
  });
  await check("audit: deleted context and scope exclusions remain review findings", async () => {
    const { snapshot, inventory } = fixture();
    snapshot.files = []; snapshot.assets = []; snapshot.contexts.lessons = [];
    inventory.objects.push({ key: "lesson-qna/q/example.png", size: "3" }, { key: "media/staging/job/source.mp3", size: "8" });
    const report = reconcile(snapshot, inventory, cfg);
    assert(report.objects[0].flags.includes("CONTEXT_NOT_FOUND"));
    assert(report.objects.some(o => o.observedClass === "OUT_OF_SCOPE"));
    assert(report.objects.some(o => o.observedClass === "STAGING_OBSERVED"));
    assert(report.objects.every(o => !o.deletionEligible));
  });
  await check("audit: incomplete inventory never claims that a referenced file is absent", async () => {
    const { key, snapshot, inventory } = fixture();
    snapshot.sources.push(await inspectSource("contents:c", { body: image(key) }, cfg, snapshot.issues, { contentId: "c" }));
    inventory.objects = []; inventory.complete = false;
    const partial = reconcile(snapshot, inventory, cfg);
    assert(partial.issues.some(i => i.code === "INVENTORY_INCOMPLETE"));
    assert(!partial.issues.some(i => i.code.endsWith("NOT_LISTED")));
    inventory.complete = true;
    assert(reconcile(snapshot, inventory, cfg).issues.some(i => i.code === "REFERENCED_OBJECT_NOT_LISTED"));
  });
  await check("audit: exact DB objectKey mapping, reviewed aliases and mismatched bucket handling", async () => {
    const { key, snapshot, inventory } = fixture();
    snapshot.files[0].objectKey = "legacy/actual.png";
    inventory.objects[0].key = "legacy/actual.png";
    snapshot.sources.push(await inspectSource("contents:c", { body: image(key) }, cfg, snapshot.issues, { contentId: "c" }));
    assert(!reconcile(snapshot, inventory, cfg).issues.some(i => i.code.endsWith("NOT_LISTED")));
    const aliased = { ...cfg, keyAliases: [{ urlKey: "old-key", bucket: "fixture", objectKey: "legacy/actual.png" }] };
    snapshot.configHash = configHash(aliased);
    snapshot.sources = [await inspectSource("contents:c", { body: image("old-key") }, aliased, snapshot.issues, { contentId: "c" })];
    const report = reconcile(snapshot, inventory, aliased);
    assert.equal(report.usageDifferences[0].assetId, "shared");
    assert(report.issues.some(i => i.code === "EXPLICIT_ALIAS_USED"));
    snapshot.files[0].bucket = "another-bucket";
    snapshot.sources = [];
    const other = reconcile(snapshot, inventory, aliased);
    assert(other.issues.some(i => i.code === "BUCKET_NOT_SCANNED"));
    assert(!other.issues.some(i => i.code === "READY_OBJECT_NOT_LISTED"));
  });
  await check("audit: alias conflict and config mismatch fail rather than guess", async () => {
    const { key, snapshot, inventory } = fixture();
    const alias = { ...cfg, keyAliases: [{ urlKey: key, bucket: "fixture", objectKey: "wrong-key" }] };
    assert.throws(() => reconcile(snapshot, inventory, alias), /AUDIT_CONFIG_MISMATCH/);
    snapshot.configHash = configHash(alias);
    assert.throws(() => reconcile(snapshot, inventory, alias), /ALIAS_CONFLICTS_WITH_REGISTERED_FILE/);
    assert.throws(() => validateConfig({ ...alias, keyAliases: [...alias.keyAliases, ...alias.keyAliases] }), /DUPLICATE_KEY_ALIAS/);
  });
  await check("audit: reviewed logical paths preserve scope and editor candidates for unreferenced prefixed objects", async () => {
    const { key, snapshot, inventory } = fixture();
    const physical = `fixture/${key}`;
    inventory.objects[0].key = physical;
    snapshot.assets = []; snapshot.files = [];
    // A matching suffix alone is not evidence of a logical mapping.
    assert.equal(reconcile(snapshot, inventory, cfg).objects[0].observedClass, "OUT_OF_SCOPE");
    snapshot.contexts.sessions.push({ id: "session", editorId: "another-coach" });
    const mapped = { ...cfg, keyAliases: [
      { urlKey: key, bucket: "fixture", objectKey: physical },
      { urlKey: "coaching/session/images/alias.png", bucket: "fixture", objectKey: physical },
    ] };
    snapshot.configHash = configHash(mapped);
    const object = reconcile(snapshot, inventory, mapped).objects[0];
    assert.equal(object.objectKey, physical);
    assert.equal(object.observedClass, "NO_REFERENCE_OBSERVED");
    assert(object.flags.includes("OWNER_UNCONFIRMED"));
    assert(!object.flags.includes("CONTEXT_NOT_FOUND"));
    assert.deepEqual(object.editorCandidateIds, ["another-coach", "coach"]);
    assert.equal(object.ownerUserId, null);
    assert.equal(object.ownershipConfirmed, false);
    assert.equal(object.deletionEligible, false);
    const anotherBucket = { ...cfg, keyAliases: mapped.keyAliases.map(a => ({ ...a, bucket: "another-bucket" })) };
    snapshot.configHash = configHash(anotherBucket);
    const unrelated = reconcile(snapshot, inventory, anotherBucket).objects[0];
    assert.equal(unrelated.observedClass, "OUT_OF_SCOPE");
    assert.deepEqual(unrelated.editorCandidateIds, []);
  });
  await check("audit: registered logical URL supplies context even when physical key is prefixed", async () => {
    const { key, snapshot, inventory } = fixture();
    snapshot.files[0].objectKey = `fixture/${key}`;
    inventory.objects[0].key = snapshot.files[0].objectKey;
    const object = reconcile(snapshot, inventory, cfg).objects[0];
    assert.equal(object.observedClass, "LIBRARY_STORED");
    assert.deepEqual(object.editorCandidateIds, ["coach"]);
    assert.equal(object.deletionEligible, false);
  });
  await check("audit: malformed completeness flags and inverted observation windows are refused", async () => {
    const { snapshot, inventory } = fixture();
    assert.throws(() => reconcile(snapshot, { ...inventory, complete: "false" } as unknown as Inventory, cfg), /UNSUPPORTED_AUDIT_INPUT/);
    assert.throws(() => reconcile(snapshot, { ...inventory, finishedAt: "invalid" }, cfg), /INVALID_AUDIT_WINDOW/);
    assert.throws(() => reconcile(snapshot, { ...inventory, finishedAt: "2026-10-06T00:00:00.000Z" }, cfg), /INVALID_AUDIT_WINDOW/);
  });
  await check("audit: custom metadata and code examples are possible holds, not actual usages", async () => {
    const { key, snapshot, inventory } = fixture();
    snapshot.sources.push(await inspectSource("contents:c", { body: `\`${proxy(key)}\``, metadata: { custom: { src: proxy(key) } } }, cfg, snapshot.issues, { contentId: "c" }));
    const report = reconcile(snapshot, inventory, cfg);
    assert.equal(report.usageDifferences.length, 0);
    assert.equal(report.objects[0].observedClass, "POSSIBLY_REFERENCED");
  });
  await check("audit: unknown media hosts and malformed BlockNote are explicit review findings", async () => {
    const issues: Snapshot["issues"] = [];
    await inspectSource("contents:c", { body: "![](https://unknown.r2.dev/courses/a.png)", metadata: { blocknote: {} } }, cfg, issues, { contentId: "c" });
    assert(issues.some(i => i.code === "UNKNOWN_MEDIA_ORIGIN"));
    assert(issues.some(i => i.code === "BODY_PARSE_FAILED"));
    assert(!JSON.stringify(issues).includes("unknown.r2.dev"));
  });
  await check("audit: list pagination preserves encoded keys and big byte totals", async () => {
    const pages: ListObjectsV2CommandOutput[] = [
      { $metadata: {}, EncodingType: "url", IsTruncated: true, NextContinuationToken: "opaque", Contents: [{ Key: "percent%2520name.png", Size: Number.MAX_SAFE_INTEGER }] },
      { $metadata: {}, EncodingType: "url", IsTruncated: false, Contents: [{ Key: "%ED%95%9C%20%EA%B8%80.png", Size: 2 }] },
    ];
    let calls = 0;
    const inventory = await readInventory({ send: async command => {
      assert.equal(command.constructor.name, "ListObjectsV2Command");
      assert.equal(command.input.ContinuationToken, calls === 0 ? undefined : "opaque");
      assert.equal(command.input.Prefix, undefined);
      return pages[calls++];
    } }, "fixture");
    assert.deepEqual(inventory.objects.map(o => o.key), ["percent%20name.png", "한 글.png"]);
    const report = reconcile(fixture().snapshot, inventory, cfg);
    assert.equal(report.summary.bytes, "9007199254740993");
  });
  await check("audit: truncated/repeated-token/duplicate/limited inventories cannot complete", async () => {
    await assert.rejects(readInventory({ send: async () => ({ $metadata: {}, IsTruncated: true }) }, "fixture"), /INCOMPLETE_INVENTORY_PAGINATION/);
    await assert.rejects(readInventory({ send: async () => ({ $metadata: {}, IsTruncated: true, NextContinuationToken: "same" }) }, "fixture"), /INCOMPLETE_INVENTORY_PAGINATION/);
    await assert.rejects(readInventory({ send: async () => ({ $metadata: {}, IsTruncated: false, Contents: [{ Key: "a", Size: 1 }, { Key: "a", Size: 1 }] }) }, "fixture"), /INVENTORY_CHANGED_DURING_SCAN/);
    await assert.rejects(readInventory({ send: async () => ({ $metadata: {}, IsTruncated: false, Contents: [{ Key: "a", Size: 1 }, { Key: "b", Size: 1 }] }) }, "fixture", 1), /INVENTORY_SCAN_LIMIT/);
    await assert.rejects(readInventory({ send: async () => { throw new Error("AccessDenied"); } }, "fixture"), /AccessDenied/);
  });
  await check("audit: real S3 SDK XML parsing decodes an encoded inventory key exactly once", async () => {
    const client = new S3Client({
      endpoint: "https://fixture.r2.cloudflarestorage.com", region: "auto", forcePathStyle: true,
      credentials: { accessKeyId: "fixture", secretAccessKey: "fixture" },
      requestHandler: { handle: async (request: { method: string; query?: Record<string, unknown> }) => {
        assert.equal(request.method, "GET");
        assert.equal(request.query?.["list-type"], "2");
        return { response: { statusCode: 200, headers: { "content-type": "application/xml" }, body: new TextEncoder().encode('<?xml version="1.0"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>fixture</Name><EncodingType>url</EncodingType><IsTruncated>false</IsTruncated><Contents><Key>percent%2520file.png</Key><Size>1</Size></Contents></ListBucketResult>') } };
      } },
    });
    try {
      const inventory = await readInventory(client, "fixture");
      assert.equal(inventory.objects[0].key, "percent%20file.png");
    } finally { client.destroy(); }
  });
  await check("audit CLI: offline report, private permissions, no body/secret output, overwrite refused", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "media-audit-cli-"));
    try {
      const { snapshot, inventory } = fixture();
      const files = { config: cfg, snapshot, inventory };
      for (const [name, value] of Object.entries(files)) await fs.writeFile(path.join(dir, name + ".json"), JSON.stringify(value));
      const args = ["--conditions=react-server", "--import", "tsx", "scripts/media-audit.ts", "--config", path.join(dir, "config.json"), "--snapshot", path.join(dir, "snapshot.json"), "--inventory", path.join(dir, "inventory.json"), "--out", path.join(dir, "report")];
      const run = promisify(execFile);
      const result = await run(process.execPath, args, { cwd: process.cwd(), env: { ...process.env, MEDIA_AUDIT_DATABASE_URL: "must-never-connect", MEDIA_AUDIT_R2_SECRET_ACCESS_KEY: "secret-sentinel" }, timeout: 30000 });
      assert(!result.stdout.includes("shared.png"));
      assert(!result.stdout.includes("secret-sentinel"));
      assert.equal(JSON.parse(await fs.readFile(path.join(dir, "report/manifest.json"), "utf8")).complete, true);
      assert.equal((await fs.stat(path.join(dir, "report"))).mode & 0o777, 0o700);
      assert.equal((await fs.stat(path.join(dir, "report/report.json"))).mode & 0o777, 0o600);
      await assert.rejects(run(process.execPath, args, { cwd: process.cwd(), timeout: 30000 }));
      assert.equal(JSON.parse(await fs.readFile(path.join(dir, "report/manifest.json"), "utf8")).complete, true);
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
  });
}
