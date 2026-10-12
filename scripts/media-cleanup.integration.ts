import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mock } from "node:test";
import { HeadObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { expireMediaPreparation, processMediaDeletion, runMediaCleanup, sweepMediaObject } from "../src/lib/media/cleanup-worker";
import { assertIsolatedCleanupBucket, createCleanupStore, type CleanupObjectStore } from "../src/lib/media/cleanup-store";
import { setMediaLibraryStatus } from "../src/lib/media/library-lifecycle";
import { postgresUtcConfig } from "../src/lib/postgres-utc";
import { withMediaTransaction } from "../src/lib/media/usage-sync";

type Check = (name: string, work: () => Promise<unknown>) => Promise<void>;
const past = new Date(0);
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function runMediaCleanupIntegration(db: PrismaClient, check: Check) {
  const bucket = `cleanup-${randomUUID()}-test`;
  const makeStore = () => {
    const objects = new Map<string, Buffer>(); const calls: string[] = [];
    const store: CleanupObjectStore & { objects: typeof objects; calls: typeof calls } = {
      bucketName: bucket, objects, calls,
      async remove(key) { calls.push(key); objects.delete(key); },
      async exists(key) { return objects.has(key); },
    };
    return store;
  };
  async function file(tx: Prisma.TransactionClient, assetId: string, role = "ORIGINAL", ready = true, deadlineAt = new Date(Date.now() + 600000), targetBucket = bucket, objectKey?: string) {
    const id = randomUUID(); const uploadId = randomUUID(); const time = new Date();
    const a = await tx.mediaAsset.findUniqueOrThrow({ where: { id: assetId } });
    const base = a.scope === "SHARED" ? `media/shared/${assetId}` : `media/personal/${a.ownerUserId}/${assetId}`;
    const key = objectKey ?? `${base}/${role === "ORIGINAL" ? "original" : `derived/${id}/${role.toLowerCase()}`}.png`;
    await tx.mediaFile.create({ data: { id, assetId, role, bucket: targetBucket, objectKey: key, urlKey: key } });
    await tx.mediaUpload.create({ data: { id: uploadId, fileId: id, sourceKind: role === "ORIGINAL" ? "CLIENT" : "DERIVATION", stagingObjectKey: `media/staging/${uploadId}/source.png`, expectedMimeType: "image/png", expectedByteSize: BigInt(1), uploadExpiresAt: past, deadlineAt } });
    // Epoch comparison catches offset loss hidden by matching adapter read/write bugs.
    const stored = await tx.$queryRaw<{ epoch: number }[]>`SELECT extract(epoch FROM deadline_at)::double precision * 1000 AS epoch FROM media_uploads WHERE id = ${uploadId}`;
    assert(Math.abs(stored[0].epoch - deadlineAt.getTime()) < 1);
    if (ready) {
      await tx.mediaFile.update({ where: { id }, data: { mimeType: "image/png", byteSize: BigInt(1), sha256: "a".repeat(64), verifiedAt: time, metadataCheckedAt: time } });
      await tx.mediaUpload.update({ where: { id: uploadId }, data: { phase: "VALIDATING", leaseToken: "fixture", leaseExpiresAt: new Date(Date.now() + 600000) } });
      await tx.mediaUpload.update({ where: { id: uploadId }, data: { phase: "PROMOTING", sourceEtag: "fixture", validatedAt: time } });
      await tx.mediaUpload.update({ where: { id: uploadId }, data: { phase: "COMPLETED", leaseToken: null, leaseExpiresAt: null, completedAt: time, stagingCleanupDueAt: past } });
      await tx.mediaFile.update({ where: { id }, data: { status: "READY", isCurrent: role !== "ORIGINAL" } });
    }
    return tx.mediaFile.findUniqueOrThrow({ where: { id }, include: { upload: true } });
  }
  async function seed(options: { ready?: boolean; deadlineAt?: Date; hold?: boolean; targetBucket?: string; objectKey?: string; scope?: string; layout?: string } = {}) {
    return db.$transaction(async tx => {
      const scope = options.scope ?? "PERSONAL";
      const a = await tx.mediaAsset.create({ data: { scope, ownerUserId: scope === "PERSONAL" ? "teacher" : null, kind: "IMAGE", originalName: "private-name.png", layout: options.layout ?? "CANONICAL", retentionHold: options.hold ? "REVIEW" : null } });
      const f = await file(tx, a.id, "ORIGINAL", options.ready ?? true, options.deadlineAt, options.targetBucket, options.objectKey);
      if (options.ready !== false) await tx.mediaAsset.update({ where: { id: a.id }, data: { storageStatus: "READY" } });
      return { ...a, file: f };
    });
  }
  async function schedule(id: string, future = false) {
    return db.$transaction(async tx => {
      await tx.mediaAsset.update({ where: { id }, data: { libraryStatus: "TRASHED", trashedAt: past, trashExpiresAt: future ? new Date(Date.now() + 86400000) : past } });
      return tx.mediaDeletionJob.create({ data: { assetId: id, nextAttemptAt: past } });
    });
  }
  const asset = (id: string) => db.mediaAsset.findUniqueOrThrow({ where: { id } });
  const freshFile = (id: string) => db.mediaFile.findUniqueOrThrow({ where: { id } });
  const upload = (id: string) => db.mediaUpload.findUniqueOrThrow({ where: { id } });
  const job = (id: string) => db.mediaDeletionJob.findUniqueOrThrow({ where: { assetId: id } });
  const makeDue = (id: string) => db.mediaDeletionJob.update({ where: { assetId: id }, data: { nextAttemptAt: past } });
  const expireJob = (id: string) => db.mediaDeletionJob.update({ where: { assetId: id }, data: { leaseExpiresAt: past } });

  await check("media time: UTC startup overrides URL time zone and transaction-local UTC handles poolers", async () => {
    const url = new URL(process.env.DATABASE_URL!); url.searchParams.set("options", "-c timezone=Asia/Seoul");
    const pool = new PrismaClient({ adapter: new PrismaPg(postgresUtcConfig({ connectionString: url.toString() })) });
    const unconfigured = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
    const verify = async (tx: Prisma.TransactionClient | PrismaClient) => {
      const [row] = await tx.$queryRaw<{ zone: string; instant: Date; epoch: number }[]>`SELECT current_setting('TimeZone') AS zone, now() AS instant, extract(epoch FROM now())::double precision * 1000 AS epoch`;
      assert.equal(row.zone, "UTC"); assert(Math.abs(row.epoch - row.instant.getTime()) < 1);
      const expected = new Date("2027-01-01T12:34:56.123Z");
      const [roundTrip] = await tx.$queryRaw<{ epoch: number }[]>`SELECT extract(epoch FROM ${expected}::timestamptz)::double precision * 1000 AS epoch`;
      assert(Math.abs(roundTrip.epoch - expected.getTime()) < 1);
    };
    try { await verify(pool); await withMediaTransaction(unconfigured, verify); }
    finally { await pool.$disconnect(); await unconfigured.$disconnect(); }
    const { prisma } = await import("../src/lib/prisma"); await verify(prisma);
  });
  await check("cleanup R2 adapter: zero-byte HEAD is present, only 404 absent, exact key DELETE", async () => {
    let status = 200; const seen: string[] = [];
    const mocked = mock.method(S3Client.prototype, "send", async (command: HeadObjectCommand | DeleteObjectCommand) => {
      assert.equal(command.input.Bucket, bucket); assert.equal(command.input.Key, "media/staging/test/source.png");
      if (command instanceof DeleteObjectCommand) { seen.push("DELETE"); return {}; }
      assert(command instanceof HeadObjectCommand);
      if (status !== 200) throw { $metadata: { httpStatusCode: status } };
      return { ContentLength: 0 };
    });
    const adapter = createCleanupStore({ bucket, endpoint: "https://isolated.r2.cloudflarestorage.com", accessKeyId: "test", secretAccessKey: "test" });
    try {
      assert.equal(await adapter.store.exists("media/staging/test/source.png"), true);
      status = 404; assert.equal(await adapter.store.exists("media/staging/test/source.png"), false);
      status = 403; await assert.rejects(adapter.store.exists("media/staging/test/source.png"));
      await adapter.store.remove("media/staging/test/source.png"); assert.deepEqual(seen, ["DELETE"]);
      await assert.rejects(adapter.store.remove("media/staging/../original.png"), /KEY_REJECTED/);
    } finally { adapter.close(); mocked.mock.restore(); }
  });

  await check("cleanup dry-run: candidate read has no DB mutations or storage calls", async () => {
    const a = await seed(); await schedule(a.id); const store = makeStore();
    const before = { a: await asset(a.id), f: await freshFile(a.file.id), j: await job(a.id), audits: await db.auditLog.count() };
    const report = await runMediaCleanup(db, { bucket, store });
    assert(report.results.some(r => r.kind === "delete" && r.id === a.id));
    assert.deepEqual({ a: await asset(a.id), f: await freshFile(a.file.id), j: await job(a.id), audits: await db.auditLog.count() }, before);
    assert.equal(store.calls.length, 0);
  });
  await check("cleanup guard: production bucket, mismatched store, and invalid limit rejected before I/O", async () => {
    for (const name of ["online-glia", "backup", "online-glia-dev/../production"]) assert.throws(() => assertIsolatedCleanupBucket(name));
    await assert.rejects(runMediaCleanup(db, { bucket, mode: "apply-isolated", store: { ...makeStore(), bucketName: "other-test" } }), /MISMATCH/);
    await assert.rejects(runMediaCleanup(db, { bucket, limit: 0 }), /LIMIT/);
  });
  await check("cleanup expiry: unstarted upload abandons original and schedules both keys", async () => {
    const a = await seed({ ready: false, deadlineAt: past });
    assert.equal(await expireMediaPreparation(db, a.file.upload!.id, bucket), true);
    assert.equal((await asset(a.id)).storageStatus, "ABANDONED"); assert.equal((await freshFile(a.file.id)).status, "RETIRED");
    const u = await upload(a.file.upload!.id); assert.equal(u.phase, "ABANDONED"); assert(u.stagingCleanupDueAt);
    assert.equal(await expireMediaPreparation(db, u.id, bucket), false);
  });
  await check("cleanup expiry: deadline and a live publication lease protect preparation", async () => {
    const future = await seed({ ready: false }); assert.equal(await expireMediaPreparation(db, future.file.upload!.id, bucket), false);
    const deadlineAt = new Date(Date.now() + 600);
    const a = await seed({ ready: false, deadlineAt });
    await db.mediaUpload.update({ where: { id: a.file.upload!.id }, data: { phase: "VALIDATING", leaseToken: "alive", leaseExpiresAt: new Date(Date.now() + 60000) } });
    await delay(Math.max(0, deadlineAt.getTime() - Date.now() + 20));
    assert.equal(await expireMediaPreparation(db, a.file.upload!.id, bucket), false);
    await db.mediaUpload.update({ where: { id: a.file.upload!.id }, data: { leaseExpiresAt: past } });
    assert.equal(await expireMediaPreparation(db, a.file.upload!.id, bucket), true);
    assert.equal((await upload(a.file.upload!.id)).leaseToken, null);
  });
  await check("cleanup derivative: expired preparation does not retire ready original or current playback", async () => {
    const a = await seed(); const current = await db.$transaction(tx => file(tx, a.id, "PLAYBACK"));
    const f = await db.$transaction(tx => file(tx, a.id, "PLAYBACK", false, past));
    assert(await expireMediaPreparation(db, f.upload!.id, bucket));
    assert.equal((await asset(a.id)).storageStatus, "READY"); assert.equal((await freshFile(a.file.id)).status, "READY"); assert.equal((await freshFile(current.id)).isCurrent, true);
    const store = makeStore(); assert.equal(await sweepMediaObject(db, f.id, "file", store), "ABSENT");
    assert.equal(await sweepMediaObject(db, current.id, "file", store), "SKIPPED"); assert.equal(store.calls.length, 1);
  });
  await check("cleanup protections: active, held, used, grace, restored and foreign bucket/key", async () => {
    const store = makeStore();
    const active = await seed(); const held = await seed({ hold: true }); const used = await seed(); const grace = await seed(); const restored = await seed();
    const foreign = await seed({ targetBucket: "foreign-test" }); const malformed = await seed({ objectKey: `media/shared/unrelated-${randomUUID()}/original.png` });
    const legacy = await seed({ layout: "LEGACY" }); const unknown = await seed({ layout: "LEGACY", scope: "UNCLASSIFIED" });
    await schedule(legacy.id);
    await schedule(grace.id, true); await schedule(restored.id); await schedule(foreign.id); await schedule(malformed.id);
    const content = await db.content.findFirstOrThrow();
    await db.mediaUsage.create({ data: { assetId: used.id, contentId: content.id, occurrenceCount: 1 } });
    const restoredRow = await asset(restored.id);
    await setMediaLibraryStatus(db, { actorId: "teacher", assetId: restored.id, libraryStatus: "ACTIVE", expectedVersion: restoredRow.updatedAt.toISOString() });
    for (const a of [active, held, used, grace, restored, foreign, malformed, legacy, unknown]) {
      assert.equal(await processMediaDeletion(db, a.id, store), "SKIPPED");
      assert.equal(await sweepMediaObject(db, a.file.id, "file", store), "SKIPPED");
      assert.equal((await asset(a.id)).storageStatus, "READY");
    }
    assert.equal(store.calls.length, 0);
    assert.equal(await sweepMediaObject(db, held.file.id, "staging", store), "SKIPPED");
  });
  await check("cleanup shared: classified common asset follows the same deletion contract", async () => {
    const a = await seed({ scope: "SHARED" }); await schedule(a.id); const store = makeStore();
    assert.equal(await processMediaDeletion(db, a.id, store), "SUCCEEDED"); assert.deepEqual(store.calls, [a.file.objectKey]);
    assert(a.file.objectKey.startsWith(`media/shared/${a.id}/`));
  });
  await check("cleanup staging: completed zero-byte object, late PUT and failure preserve future sweeps", async () => {
    const a = await seed(); const u = a.file.upload!; const store = makeStore();
    store.objects.set(u.stagingObjectKey, Buffer.alloc(0));
    assert.equal(await sweepMediaObject(db, a.file.id, "staging", store), "ABSENT");
    let row = await upload(u.id); assert(row.stagingLastAbsentAt); assert(row.stagingCleanupDueAt! > new Date()); assert.equal((await freshFile(a.file.id)).status, "READY");
    store.objects.set(u.stagingObjectKey, Buffer.from("late"));
    await db.mediaUpload.update({ where: { id: u.id }, data: { stagingCleanupDueAt: past } });
    assert.equal(await sweepMediaObject(db, a.file.id, "staging", store), "ABSENT"); assert(!store.objects.has(u.stagingObjectKey));
    row = await upload(u.id); const observed = row.stagingLastAbsentAt;
    await db.mediaUpload.update({ where: { id: u.id }, data: { stagingCleanupDueAt: past } });
    const failed = { ...store, exists: async () => { throw new Error("credentials/secret-object-key"); } };
    assert.equal(await sweepMediaObject(db, a.file.id, "staging", failed), "STORAGE_FAILED");
    row = await upload(u.id); assert.deepEqual(row.stagingLastAbsentAt, observed); assert(row.stagingCleanupDueAt! > new Date());
    assert(!JSON.stringify(await db.auditLog.findMany({ where: { entityId: a.file.id } })).includes("credentials"));
  });
  await check("cleanup staging: expired observation cannot overwrite a reclaimed sweep", async () => {
    const a = await seed(); const store = makeStore(); const u = a.file.upload!;
    store.exists = async () => {
      store.exists = async () => false;
      await db.mediaUpload.update({ where: { id: u.id }, data: { stagingCleanupDueAt: past } });
      assert.equal(await sweepMediaObject(db, a.file.id, "staging", store), "ABSENT");
      return true; // Older failure must not postpone/reset the newer success.
    };
    assert.equal(await sweepMediaObject(db, a.file.id, "staging", store), "LOST_CLAIM");
    assert((await upload(u.id)).stagingLastAbsentAt);
    const events = await db.auditLog.findMany({ where: { entityId: a.file.id, action: { in: ["MEDIA_STAGING_SWEEP", "MEDIA_STAGING_SWEEP_CLAIMED"] } } });
    assert(events.some(e => (e.metadata as { outcome: string }).outcome === "CLAIMED"));
    assert(events.some(e => (e.metadata as { outcome: string }).outcome === "ABSENT"));
  });
  await check("cleanup deletion: partial failure retries only remaining files without returning READY", async () => {
    const a = await seed(); const derivative = await db.$transaction(tx => file(tx, a.id, "THUMBNAIL")); await schedule(a.id);
    const store = makeStore(); const remove = store.remove;
    store.remove = async key => { if (key === derivative.objectKey) throw new Error("private failure"); await remove(key); };
    assert.equal(await processMediaDeletion(db, a.id, store), "RETRY");
    assert.equal((await freshFile(a.file.id)).status, "DELETED"); assert.equal((await freshFile(derivative.id)).status, "RETIRED");
    assert.equal((await freshFile(derivative.id)).isCurrent, false); assert.equal((await asset(a.id)).storageStatus, "DELETING");
    const retry = await job(a.id); assert.equal(retry.status, "RETRY"); assert(retry.nextAttemptAt > new Date());
    assert.equal(await sweepMediaObject(db, derivative.id, "file", store), "SKIPPED");
    await makeDue(a.id); store.remove = remove;
    assert.equal(await processMediaDeletion(db, a.id, store), "SUCCEEDED");
    assert.equal((await asset(a.id)).storageStatus, "DELETED"); assert.equal((await job(a.id)).attemptCount, 2);
    assert.equal(store.calls.filter(key => key === a.file.objectKey).length, 1);
  });
  await check("cleanup deletion: pending derivative is abandoned and late final write is swept after success", async () => {
    const a = await seed(); const f = await db.$transaction(tx => file(tx, a.id, "PLAYBACK", false)); await schedule(a.id);
    const store = makeStore();
    assert.equal(await processMediaDeletion(db, a.id, store), "SUCCEEDED");
    const u = await upload(f.upload!.id); assert.equal(u.phase, "ABANDONED"); assert(u.stagingCleanupDueAt);
    store.objects.set(f.objectKey, Buffer.from("late")); await db.mediaFile.update({ where: { id: f.id }, data: { nextSweepAt: past } });
    assert.equal(await sweepMediaObject(db, f.id, "file", store), "ABSENT");
    assert(!store.objects.has(f.objectKey)); assert((await freshFile(f.id)).nextSweepAt! > new Date()); assert.equal((await job(a.id)).status, "SUCCEEDED");
  });
  await check("cleanup job fence: expired token rolls back file observation and audit, then reclaims", async () => {
    const a = await seed(); await schedule(a.id); const store = makeStore();
    store.exists = async () => { await expireJob(a.id); return false; };
    assert.equal(await processMediaDeletion(db, a.id, store), "LOST_CLAIM");
    assert.equal((await freshFile(a.file.id)).status, "RETIRED"); assert.equal((await freshFile(a.file.id)).lastAbsenceObservedAt, null);
    assert.equal(await db.auditLog.count({ where: { entityId: a.file.id, action: "MEDIA_DELETION_OBJECT" } }), 0);
    store.exists = async () => false;
    assert.equal(await processMediaDeletion(db, a.id, store), "SUCCEEDED"); assert.equal((await job(a.id)).attemptCount, 2);
  });
  await check("cleanup job fence: old failure cannot reverse a replacement worker's success", async () => {
    const a = await seed(); await schedule(a.id); const store = makeStore();
    store.exists = async () => {
      store.exists = async () => false; await expireJob(a.id);
      assert.equal(await processMediaDeletion(db, a.id, store), "SUCCEEDED"); return true;
    };
    assert.equal(await processMediaDeletion(db, a.id, store), "LOST_CLAIM");
    assert.equal((await asset(a.id)).storageStatus, "DELETED"); assert.equal((await job(a.id)).status, "SUCCEEDED");
  });
  await check("cleanup audit failure: storage absence does not commit without audit, expired claim resumes", async () => {
    const a = await seed(); await schedule(a.id); const store = makeStore();
    await db.$executeRawUnsafe(`CREATE FUNCTION media_test_cleanup_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'MEDIA_DELETION_OBJECT' THEN RAISE EXCEPTION 'injected cleanup audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER media_test_cleanup_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION media_test_cleanup_audit()`);
    try { await assert.rejects(processMediaDeletion(db, a.id, store), /injected cleanup audit failure/); }
    finally { await db.$executeRawUnsafe(`DROP TRIGGER media_test_cleanup_audit ON audit_logs`); await db.$executeRawUnsafe(`DROP FUNCTION media_test_cleanup_audit()`); }
    assert.equal((await freshFile(a.file.id)).status, "RETIRED"); assert.equal((await job(a.id)).status, "RUNNING");
    assert.equal(await processMediaDeletion(db, a.id, store), "SKIPPED");
    await expireJob(a.id); assert.equal(await processMediaDeletion(db, a.id, store), "SUCCEEDED");
  });
  await check("cleanup concurrency: one live claim deletes the asset once", async () => {
    const a = await seed(); await schedule(a.id); const store = makeStore();
    const outcomes = await Promise.all([processMediaDeletion(db, a.id, store), processMediaDeletion(db, a.id, store)]);
    assert.deepEqual(outcomes.sort(), ["SKIPPED", "SUCCEEDED"]); assert.equal(store.calls.length, 1);
  });
  await check("cleanup residual: abandoned original is swept without creating deletion job", async () => {
    const a = await seed({ ready: false, deadlineAt: past }); await expireMediaPreparation(db, a.file.upload!.id, bucket);
    const store = makeStore(); store.objects.set(a.file.objectKey, Buffer.from("late"));
    assert.equal(await sweepMediaObject(db, a.file.id, "file", store), "ABSENT");
    assert.equal((await freshFile(a.file.id)).status, "DELETED"); assert.equal((await asset(a.id)).storageStatus, "ABANDONED");
    assert.equal(await db.mediaDeletionJob.findUnique({ where: { assetId: a.id } }), null);
  });
  await check("cleanup CLI: help and apply isolation failures require no connection and redact secrets", async () => {
    const invoke = (...args: string[]) => spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/media-cleanup.ts", ...args], {
      cwd: process.cwd(), encoding: "utf8", env: { ...process.env, MEDIA_CLEANUP_DATABASE_URL: "postgresql://test:supersecret@db.invalid/production", MEDIA_CLEANUP_R2_BUCKET: bucket, MEDIA_CLEANUP_ENVIRONMENT: "isolated" },
    });
    assert.equal(invoke("--help").status, 0);
    const failed = invoke("--apply", "--confirm-bucket", bucket); assert.equal(failed.status, 1); assert(!`${failed.stdout}${failed.stderr}`.includes("supersecret"));
  });
  await check("cleanup batch: bounded isolated pass executes eligible work and never includes raw keys", async () => {
    const report = await runMediaCleanup(db, { bucket, store: makeStore(), mode: "apply-isolated", limit: 2 });
    assert(report.results.length <= 8); assert(!JSON.stringify(report).includes("media/personal/"));
    assert(!report.results.some(r => r.outcome === "WORKER_FAILED"));
  });
}
