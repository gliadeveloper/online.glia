import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { AsyncLocalStorage } from "node:async_hooks";
import { parse } from "dotenv";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "../src/generated/prisma/client";
import { postgresUtcConfig } from "../src/lib/postgres-utc";
import { assertLegacyKeyPrefix, assertR2Endpoint } from "../src/lib/media/r2-config";
import { buildBackfillPlan } from "./media-audit/backfill-plan";
import { readSnapshot } from "./media-audit/database";
import { readInventory } from "./media-audit/storage";
import { fingerprint, validateConfig } from "./media-audit/references";
import { assertCandidate, assertLocalBackfillUrl, registerLegacyRehearsal, type VerifiedLegacy } from "./media-backfill/register";
import { assertObservedHead, legacyReadStore, verifyLegacyObject } from "./media-backfill/verify";

// Connections use only explicit files. The legacy permission module loads dotenv,
// but cannot override DATABASE_URL, which is pinned before that import.
Object.assign(globalThis, { AsyncLocalStorage });
const safeCode = (error: unknown) => {
  const code = (error as { code?: string }).code;
  const message = error instanceof Error ? error.message : "";
  return /^[A-Z][A-Z0-9_]{2,80}$/.test(code ?? "") ? code! : /^[A-Z][A-Z0-9_]{2,80}$/.test(message) ? message : "BACKFILL_OPERATION_FAILED";
};

async function main() {
  const { values } = parseArgs({ options: {
    help: { type: "boolean" }, "apply-local": { type: "boolean" }, "local-db-env": { type: "string" },
    "r2-env": { type: "string" }, config: { type: "string" }, out: { type: "string" },
    "expected-bucket": { type: "string" }, "legacy-prefix": { type: "string" }, concurrency: { type: "string", default: "1" },
  } });
  if (values.help) {
    console.log("로컬 복제 DB 전용 등록 리허설. R2 LIST/HEAD/GET만 실행.\n--apply-local --local-db-env FILE --r2-env FILE --config FILE --out NEW_DIRECTORY --expected-bucket BUCKET --legacy-prefix PREFIX [--concurrency 1|2]"); return;
  }
  if (!values["apply-local"] || !values["local-db-env"] || !values["r2-env"] || !values.config || !values.out ||
      !values["expected-bucket"] || values["legacy-prefix"] === undefined) throw new Error("BACKFILL_EXPLICIT_INPUT_REQUIRED");
  if (!["1", "2"].includes(values.concurrency)) throw new Error("BACKFILL_INVALID_CONCURRENCY");
  const concurrency = Number(values.concurrency);
  const dbEnv = parse(await fs.readFile(values["local-db-env"]));
  const dbName = assertLocalBackfillUrl(dbEnv.DATABASE_URL ?? "");
  const r2Env = parse(await fs.readFile(values["r2-env"]));
  const prefix = values["legacy-prefix"];
  assertLegacyKeyPrefix(prefix);
  const bucket = values["expected-bucket"];
  if (r2Env.R2_BUCKET !== bucket || !r2Env.R2_ACCESS_KEY_ID || !r2Env.R2_SECRET_ACCESS_KEY) throw new Error("BACKFILL_BUCKET_MISMATCH");
  const endpoint = new URL(r2Env.R2_ENDPOINT);
  // Compatibility is explicit: only the already reviewed bucket-path endpoint.
  if (endpoint.pathname !== "/") {
    if (endpoint.pathname !== `/${bucket}` || prefix !== `${bucket}/`) throw new Error("BACKFILL_ENDPOINT_MAPPING_REQUIRED");
    endpoint.pathname = "/";
  }
  assertR2Endpoint(endpoint.toString());
  const config = validateConfig(JSON.parse(await fs.readFile(values.config, "utf8")));
  if (config.keyAliases?.some(a => a.bucket !== bucket || a.objectKey !== prefix + a.urlKey)) throw new Error("BACKFILL_ALIAS_MAPPING_MISMATCH");
  const out = path.resolve(values.out);
  await fs.mkdir(out, { mode: 0o700 }); // exclusive new run, parent must exist
  const write = (name: string, value: unknown) => fs.writeFile(path.join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  const client = new Client(postgresUtcConfig({ connectionString: dbEnv.DATABASE_URL, connectionTimeoutMillis: 10000 }));
  const db = new PrismaClient({ adapter: new PrismaPg(postgresUtcConfig({ connectionString: dbEnv.DATABASE_URL })) });
  const s3 = new S3Client({ endpoint: endpoint.toString(), region: r2Env.R2_REGION || "auto", forcePathStyle: true, maxAttempts: 2,
    credentials: { accessKeyId: r2Env.R2_ACCESS_KEY_ID, secretAccessKey: r2Env.R2_SECRET_ACCESS_KEY },
    requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" });
  let legacyDb: PrismaClient | undefined;
  const startedAt = new Date().toISOString();
  const outcomes: Record<string, unknown>[] = [];
  try {
    await client.connect();
    if ((await client.query("SELECT current_database() AS name")).rows[0].name !== dbName) throw new Error("BACKFILL_DATABASE_MISMATCH");
    const originalAuditIds = (await client.query<{ id: string }>("SELECT id FROM audit_logs ORDER BY id")).rows.map(r => r.id);
    const fingerprints = async () => {
      const tables = (await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'media_%' AND tablename <> '_prisma_migrations' ORDER BY tablename")).rows;
      const result: Record<string, unknown> = {};
      for (const { tablename } of tables) {
        const quoted = '"' + tablename.replaceAll('"', '""') + '"';
        result[tablename] = (await client.query(`SELECT count(*)::int AS rows, md5(COALESCE(string_agg(to_jsonb(t)::text, E'\\n' ORDER BY to_jsonb(t)::text),'')) AS hash FROM public.${quoted} t ${tablename === "audit_logs" ? "WHERE id = ANY($1::text[])" : ""}`, tablename === "audit_logs" ? [originalAuditIds] : [])).rows[0];
      }
      return result;
    };
    const before = await fingerprints();
    const snapshot = await readSnapshot(client, config);
    if (snapshot.mediaSchema !== "PRESENT") throw new Error("BACKFILL_MEDIA_SCHEMA_REQUIRED");
    // These two catalog findings were manually reviewed; recheck their values.
    if (snapshot.issues.some(i => i.code !== "SOURCE_COVERAGE_REVIEW_REQUIRED") ||
        snapshot.coverage.unknownColumns.some(c => !["lesson_materials.contentType", "signup_drafts.avatarPresetId"].includes(c))) throw new Error("BACKFILL_COVERAGE_REVIEW_REQUIRED");
    const unknown = await client.query(`SELECT
      (SELECT count(*)::int FROM signup_drafts WHERE "avatarPresetId" IS NOT NULL) AS presets,
      (SELECT count(*)::int FROM lesson_materials WHERE "contentType" IS NOT NULL AND "contentType" !~ '^[a-zA-Z0-9.+-]+/[a-zA-Z0-9.+-]+$') AS invalid_mimes`);
    if (unknown.rows[0].presets || unknown.rows[0].invalid_mimes) throw new Error("BACKFILL_COVERAGE_VALUES_CHANGED");
    const inventory = await readInventory(s3, bucket);
    const plan = buildBackfillPlan(snapshot, inventory, config);
    const planHash = fingerprint(JSON.stringify(plan));
    await write("snapshot.private.json", snapshot); await write("inventory.private.json", inventory);
    await write("plan.private.json", plan); await write("before.private.json", before);
    process.env.DATABASE_URL = dbEnv.DATABASE_URL;
    const { assertR2MediaAccess } = await import("../src/lib/media/r2-media-access");
    legacyDb = (await import("../src/lib/prisma")).prisma;
    const actors = await db.user.findMany({ select: { id: true } });
    const store = legacyReadStore(s3);
    const entries = plan.entries.filter(e => ["REVIEW_FOR_REGISTRATION", "KEEP_REGISTERED"].includes(e.decision));
    const totalBytes = entries.reduce((n, e) => n + BigInt(e.observed?.byteSize ?? "0"), BigInt(0));
    if (entries.length > 100 || totalBytes > BigInt(5 * 1024 ** 3)) throw new Error("BACKFILL_REHEARSAL_BATCH_LIMIT");
    await write("started.private.json", { startedAt, planHash, database: dbName, candidates: entries.length, bytes: String(totalBytes), concurrency, storageWrites: false });
    console.log(JSON.stringify({ phase: "START", candidates: entries.length, bytes: String(totalBytes), concurrency, localOnly: true }));
    async function processEntry(index: number) {
      const entry = entries[index];
      let outcome: Record<string, unknown>;
      try {
        assertCandidate(entry, config);
        const access = [];
        for (const actor of actors) {
          let previouslyAllowed = false;
          try { await assertR2MediaAccess(actor.id, entry.urlKeys[0]); previouslyAllowed = true; }
          catch (error) { if (!["FORBIDDEN", "UNAUTHORIZED"].includes((error as { code?: string }).code ?? "")) throw error; }
          access.push({ id: actor.id, previouslyAllowed });
        }
        let verified: VerifiedLegacy;
        if (entry.registeredFileId) {
          const file = await db.mediaFile.findUniqueOrThrow({ where: { id: entry.registeredFileId } });
          assertObservedHead(entry, await store.head(entry.bucket, entry.objectKey));
          if (!file.verifiedAt || !file.metadataCheckedAt || !file.mimeType || !file.sha256 || !file.etag || !file.byteSize) throw new Error("BACKFILL_EXISTING_UNVERIFIED");
          verified = { bucket: file.bucket, objectKey: file.objectKey, byteSize: Number(file.byteSize), etag: file.etag,
            mimeType: file.mimeType as VerifiedLegacy["mimeType"], sha256: file.sha256, verifiedAt: file.verifiedAt, metadataCheckedAt: file.metadataCheckedAt };
        } else verified = await verifyLegacyObject(entry, store, out);
        // Recheck immediately before committing; ETag is a version guard, not SHA-256.
        assertObservedHead(entry, await store.head(entry.bucket, entry.objectKey));
        const registration = await registerLegacyRehearsal(db, { entry, config, verified, planHash, actors: access });
        outcome = { keyRef: entry.keyRef, ok: true, ...registration, verified, access };
      } catch (error) { outcome = { keyRef: entry.keyRef, ok: false, code: safeCode(error) }; }
      outcomes.push(outcome);
      await write(`object-${String(index + 1).padStart(3, "0")}.private.json`, outcome);
      console.log(JSON.stringify({ phase: "OBJECT", done: outcomes.length, total: entries.length, ok: outcome.ok, code: outcome.code, created: outcome.created }));
    }
    let next = 0;
    // Wait for every active file's finally cleanup even if an evidence write fails.
    const workers = await Promise.allSettled(Array.from({ length: concurrency }, async () => {
      while (next < entries.length) { const index = next++; await processEntry(index); }
    }));
    if (workers.some(r => r.status === "rejected")) throw new Error("BACKFILL_EVIDENCE_WRITE_FAILED");
    const after = await fingerprints();
    await write("after.private.json", after);
    const addedAudit = await client.query<{ count: number }>("SELECT count(*)::int AS count FROM audit_logs WHERE NOT (id = ANY($1::text[]))", [originalAuditIds]);
    const unchanged = JSON.stringify(before) === JSON.stringify(after) && addedAudit.rows[0].count === outcomes.filter(o => o.created).length;
    const result = { startedAt, finishedAt: new Date().toISOString(), planHash, candidates: entries.length,
      succeeded: outcomes.filter(o => o.ok).length, failed: outcomes.filter(o => !o.ok).length,
      created: outcomes.filter(o => o.created).length, reused: outcomes.filter(o => o.ok && !o.created).length,
      businessTablesUnchanged: unchanged, tablesChecked: Object.keys(before).length,
      usages: outcomes.reduce((n, o) => n + (typeof o.usages === "number" ? o.usages : 0), 0),
      addedViewerPairs: outcomes.reduce((n, o) => n + (Array.isArray(o.addedViewers) ? o.addedViewers.length : 0), 0),
      storageWrites: false, productionDatabaseWrites: false, productionReady: false, localOnly: true };
    await write("result.private.json", result);
    console.log(JSON.stringify(result));
    if (!unchanged || result.failed) process.exitCode = 1;
  } finally {
    await db.$disconnect(); await legacyDb?.$disconnect(); await client.end(); s3.destroy();
  }
}
main().catch(error => { console.error(JSON.stringify({ code: safeCode(error), localOnly: true })); process.exitCode = 1; });
