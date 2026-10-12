import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { assertIsolatedCleanupBucket, type CleanupObjectStore } from "./cleanup-store";
import { withMediaTransaction } from "./usage-sync";

type Tx = Prisma.TransactionClient;
const ACTIVE = ["ISSUED", "VALIDATING", "PROMOTING"];
const TERMINAL = ["COMPLETED", "ABANDONED"];
const LEASE_MS = 5 * 60000;
const SWEEP_MS = 86400000;
type Outcome = "ABSENT" | "OBJECT_PRESENT" | "STORAGE_FAILED";
class LostClaim extends Error {}

async function now(tx: Tx) {
  return (await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`)[0].now;
}
function later(time: Date, delay: number) { return new Date(time.getTime() + delay); }
function retryDelay(attempt: number) { return Math.round(Math.min(3600000, 30000 * 2 ** Math.min(attempt - 1, 7)) * (1 + Math.random() * 0.25)); }

/** Asset first, including rereads after waiting. No object-store call inside this lock. */
async function lockAsset(tx: Tx, assetId: string) {
  await tx.$queryRaw`SELECT id FROM media_assets WHERE id = ${assetId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM media_files WHERE asset_id = ${assetId} ORDER BY id FOR UPDATE`;
  await tx.$queryRaw`SELECT u.id FROM media_uploads u JOIN media_files f ON f.id = u.file_id WHERE f.asset_id = ${assetId} ORDER BY u.id FOR UPDATE OF u`;
  await tx.$queryRaw`SELECT id FROM media_deletion_jobs WHERE asset_id = ${assetId} FOR UPDATE`;
  return tx.mediaAsset.findUnique({ where: { id: assetId }, include: { files: { include: { upload: true }, orderBy: { id: "asc" } }, deletionJob: true, _count: { select: { usages: true } } } });
}
type Asset = NonNullable<Awaited<ReturnType<typeof lockAsset>>>;
type File = Asset["files"][number];

function eligibleAsset(a: Asset) { return a.layout === "CANONICAL" && a.scope !== "UNCLASSIFIED" && !a.retentionHold; }
function validIdentity(a: Asset, f: File, bucket: string) {
  const id = /^[a-zA-Z0-9_-]+$/;
  if (!id.test(a.id) || !id.test(f.id) || !f.upload || !id.test(f.upload.id) || f.bucket !== bucket) return false;
  if (a.scope === "PERSONAL" && (!a.ownerUserId || !id.test(a.ownerUserId))) return false;
  const base = a.scope === "SHARED" ? `media/shared/${a.id}/` : `media/personal/${a.ownerUserId}/${a.id}/`;
  const prefix = f.role === "ORIGINAL" ? `${base}original.` : `${base}derived/${f.id}/${f.role.toLowerCase()}.`;
  const staging = `media/staging/${f.upload.id}/source.`;
  const ext = /^[a-z0-9]{1,10}$/;
  return f.objectKey.startsWith(prefix) && ext.test(f.objectKey.slice(prefix.length)) && f.upload.stagingObjectKey.startsWith(staging) && ext.test(f.upload.stagingObjectKey.slice(staging.length));
}
async function audit(tx: Tx, entityType: string, entityId: string, action: string, metadata: Prisma.InputJsonObject) {
  await tx.auditLog.create({ data: { entityType, entityId, action, metadata } });
}
async function removeAndObserve(store: CleanupObjectStore, key: string): Promise<Outcome> {
  try {
    await store.remove(key);
    return await store.exists(key) ? "OBJECT_PRESENT" : "ABSENT";
  } catch { return "STORAGE_FAILED"; } // Never persist raw SDK errors, paths or credentials.
}

export async function expireMediaPreparation(db: PrismaClient, uploadId: string, bucket: string) {
  assertIsolatedCleanupBucket(bucket);
  const preview = await db.mediaUpload.findUnique({ where: { id: uploadId }, select: { file: { select: { assetId: true } } } });
  if (!preview) return false;
  return withMediaTransaction(db, async tx => {
    const a = await lockAsset(tx, preview.file.assetId);
    const f = a?.files.find(file => file.upload?.id === uploadId); const u = f?.upload;
    const time = await now(tx);
    if (!a || !f || !u || !eligibleAsset(a) || !validIdentity(a, f, bucket) || !ACTIVE.includes(u.phase) || u.deadlineAt > time || (u.leaseExpiresAt && u.leaseExpiresAt > time)) return false;
    if (f.status !== "PENDING" || (f.role === "ORIGINAL" ? a.storageStatus !== "PENDING" : a.storageStatus !== "READY")) return false;
    await tx.mediaUpload.update({ where: { id: u.id }, data: { phase: "ABANDONED", abandonedAt: time, stagingCleanupDueAt: time, leaseToken: null, leaseExpiresAt: null, lastError: "DEADLINE" } });
    await tx.mediaFile.update({ where: { id: f.id }, data: { status: "RETIRED", isCurrent: false, cleanupRequestedAt: time, nextSweepAt: time } });
    if (f.role === "ORIGINAL") await tx.mediaAsset.update({ where: { id: a.id }, data: { storageStatus: "ABANDONED" } });
    await audit(tx, "MediaUpload", u.id, "MEDIA_UPLOAD_ABANDONED", { code: "DEADLINE" });
    return true;
  });
}

async function fenceJob(tx: Tx, jobId: string, token: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    UPDATE media_deletion_jobs SET lease_expires_at = clock_timestamp() + interval '5 minutes', updated_at = clock_timestamp()
    WHERE id = ${jobId} AND status = 'RUNNING' AND lease_token = ${token} AND lease_expires_at > clock_timestamp() RETURNING id`;
  if (rows.length !== 1) throw new LostClaim();
}

export async function processMediaDeletion(db: PrismaClient, assetId: string, store: CleanupObjectStore): Promise<"SKIPPED" | "SUCCEEDED" | "RETRY" | "LOST_CLAIM"> {
  assertIsolatedCleanupBucket(store.bucketName);
  const claim = await withMediaTransaction(db, async tx => {
    const a = await lockAsset(tx, assetId); const job = a?.deletionJob; const time = await now(tx);
    if (!a || !job || !eligibleAsset(a) || a._count.usages || !a.files.every(f => validIdentity(a, f, store.bucketName))) return null;
    const first = job.status === "SCHEDULED" && job.nextAttemptAt <= time && a.libraryStatus === "TRASHED" && a.storageStatus === "READY" && a.trashExpiresAt && a.trashExpiresAt <= time;
    const retry = a.storageStatus === "DELETING" && ((job.status === "RETRY" && job.nextAttemptAt <= time) || (job.status === "RUNNING" && job.leaseExpiresAt && job.leaseExpiresAt <= time));
    if (!first && !retry) return null;
    if (first) {
      await tx.mediaAsset.update({ where: { id: a.id }, data: { storageStatus: "DELETING" } });
      for (const f of a.files) {
        if (f.status === "PENDING" || f.status === "READY") await tx.mediaFile.update({ where: { id: f.id }, data: { status: "RETIRED", isCurrent: false, cleanupRequestedAt: time, nextSweepAt: time } });
        if (f.upload && ACTIVE.includes(f.upload.phase)) await tx.mediaUpload.update({ where: { id: f.upload.id }, data: { phase: "ABANDONED", abandonedAt: time, stagingCleanupDueAt: time, leaseToken: null, leaseExpiresAt: null, lastError: "ASSET_DELETING" } });
      }
    }
    const token = randomUUID();
    await tx.mediaDeletionJob.update({ where: { id: job.id }, data: { status: "RUNNING", leaseToken: token, leaseExpiresAt: later(time, LEASE_MS), attemptCount: { increment: 1 }, lastError: null } });
    await audit(tx, "MediaDeletionJob", job.id, "MEDIA_DELETION_CLAIMED", { attempt: job.attemptCount + 1 });
    return { jobId: job.id, token, files: a.files.filter(f => f.status !== "DELETED") };
  });
  if (!claim) return "SKIPPED";
  try {
    for (const file of claim.files) {
      await withMediaTransaction(db, async tx => { await lockAsset(tx, assetId); await fenceJob(tx, claim.jobId, claim.token); });
      const outcome = await removeAndObserve(store, file.objectKey);
      await withMediaTransaction(db, async tx => {
        await lockAsset(tx, assetId); const time = await now(tx);
        if (outcome === "ABSENT") await tx.mediaFile.update({ where: { id: file.id }, data: { status: "DELETED", lastAbsenceObservedAt: time, nextSweepAt: later(time, SWEEP_MS) } });
        await audit(tx, "MediaFile", file.id, "MEDIA_DELETION_OBJECT", { outcome });
        // Last statement: an expired/replaced token rolls back observations AND audit.
        await fenceJob(tx, claim.jobId, claim.token);
      });
    }
    return await withMediaTransaction(db, async tx => {
      const a = await lockAsset(tx, assetId); const time = await now(tx);
      if (!a || !a.deletionJob) throw new LostClaim();
      const done = a.files.every(f => f.status === "DELETED");
      if (done) await tx.mediaAsset.update({ where: { id: assetId }, data: { storageStatus: "DELETED" } });
      await audit(tx, "MediaDeletionJob", claim.jobId, done ? "MEDIA_DELETION_SUCCEEDED" : "MEDIA_DELETION_RETRY", { attempt: a.deletionJob.attemptCount });
      const rows = await tx.$queryRaw<{ id: string }[]>`
        UPDATE media_deletion_jobs SET status = ${done ? "SUCCEEDED" : "RETRY"}, lease_token = NULL, lease_expires_at = NULL,
          completed_at = ${done ? time : null}::timestamptz, next_attempt_at = ${later(time, retryDelay(a.deletionJob.attemptCount))},
          last_error = ${done ? null : "OBJECT_CLEANUP_FAILED"}, updated_at = clock_timestamp()
        WHERE id = ${claim.jobId} AND status = 'RUNNING' AND lease_token = ${claim.token} AND lease_expires_at > clock_timestamp() RETURNING id`;
      if (rows.length !== 1) throw new LostClaim();
      return done ? "SUCCEEDED" as const : "RETRY" as const;
    });
  } catch (error) { if (error instanceof LostClaim) return "LOST_CLAIM"; throw error; }
}

function sweepEligible(a: Asset, f: File, kind: "staging" | "file", time: Date) {
  if (!eligibleAsset(a) || !f.upload) return false;
  if (kind === "staging") return TERMINAL.includes(f.upload.phase) && !!f.upload.stagingCleanupDueAt && f.upload.stagingCleanupDueAt <= time;
  if (!["RETIRED", "DELETED"].includes(f.status) || f.isCurrent || !f.nextSweepAt || f.nextSweepAt > time) return false;
  if (["ABANDONED", "DELETED"].includes(a.storageStatus)) return a._count.usages === 0;
  return a.storageStatus === "READY" && f.role !== "ORIGINAL" && f.upload.phase === "ABANDONED";
}

/** Due timestamps are bounded claims for sweeps; only deletion jobs own DELETING files. */
export async function sweepMediaObject(db: PrismaClient, fileId: string, kind: "staging" | "file", store: CleanupObjectStore): Promise<"SKIPPED" | "LOST_CLAIM" | Outcome> {
  assertIsolatedCleanupBucket(store.bucketName);
  const preview = await db.mediaFile.findUnique({ where: { id: fileId }, select: { assetId: true } });
  if (!preview) return "SKIPPED";
  const action = kind === "staging" ? "MEDIA_STAGING_SWEEP" : "MEDIA_FILE_SWEEP";
  const claim = await withMediaTransaction(db, async tx => {
    const a = await lockAsset(tx, preview.assetId); const f = a?.files.find(f => f.id === fileId); const time = await now(tx);
    if (!a || !f || !validIdentity(a, f, store.bucketName) || !sweepEligible(a, f, kind, time)) return null;
    // Sweep failures have their own audit counter, separate from upload attempts.
    const last = await tx.auditLog.findFirst({ where: { entityType: "MediaFile", entityId: fileId, action: `${action}_CLAIMED` }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    const finished = last ? await tx.auditLog.findFirst({ where: { entityType: "MediaFile", entityId: fileId, action, metadata: { path: ["claimId"], equals: last.id } } }) : null;
    const metadata = last?.metadata as { attempt?: number } | null;
    const previous = Number.isSafeInteger(metadata?.attempt) ? Math.max(0, metadata!.attempt!) : 0;
    const attempt = (finished?.metadata as { outcome?: string } | null)?.outcome === "ABSENT" ? 1 : Math.min(previous + 1, 1000);
    const due = later(time, LEASE_MS); // Millisecond value written exactly; no truncated DB timestamp comparison.
    if (kind === "staging") await tx.mediaUpload.update({ where: { id: f.upload!.id }, data: { stagingCleanupDueAt: due } });
    else await tx.mediaFile.update({ where: { id: fileId }, data: { nextSweepAt: due } });
    const event = await tx.auditLog.create({ data: { entityType: "MediaFile", entityId: fileId, action: `${action}_CLAIMED`, metadata: { attempt, outcome: "CLAIMED" } } });
    return { due, attempt, eventId: event.id, uploadId: f.upload!.id, key: kind === "staging" ? f.upload!.stagingObjectKey : f.objectKey };
  });
  if (!claim) return "SKIPPED";
  const outcome = await removeAndObserve(store, claim.key);
  try {
    await withMediaTransaction(db, async tx => {
      const a = await lockAsset(tx, preview.assetId); const f = a?.files.find(f => f.id === fileId); const time = await now(tx);
      if (!a || !f || !eligibleAsset(a) || (kind === "file" && a.storageStatus === "DELETING")) throw new LostClaim();
      const next = later(time, outcome === "ABSENT" ? SWEEP_MS : retryDelay(claim.attempt));
      const absent = outcome === "ABSENT";
      await audit(tx, "MediaFile", fileId, action, { claimId: claim.eventId, attempt: claim.attempt, outcome });
      const rows = kind === "staging" ? await tx.$queryRaw<{ id: string }[]>`
        UPDATE media_uploads SET staging_cleanup_due_at = ${next}, staging_last_absent_at = CASE WHEN ${absent} THEN clock_timestamp() ELSE staging_last_absent_at END, updated_at = clock_timestamp()
        WHERE id = ${claim.uploadId} AND phase IN ('COMPLETED','ABANDONED') AND staging_cleanup_due_at = ${claim.due} AND staging_cleanup_due_at > clock_timestamp() RETURNING id`
        : await tx.$queryRaw<{ id: string }[]>`
        UPDATE media_files SET next_sweep_at = ${next}, status = CASE WHEN ${absent} THEN 'DELETED' ELSE status END,
          last_absence_observed_at = CASE WHEN ${absent} THEN clock_timestamp() ELSE last_absence_observed_at END, updated_at = clock_timestamp()
        WHERE id = ${fileId} AND status IN ('RETIRED','DELETED') AND next_sweep_at = ${claim.due} AND next_sweep_at > clock_timestamp() RETURNING id`;
      if (rows.length !== 1) throw new LostClaim();
    });
    return outcome;
  } catch (error) { if (error instanceof LostClaim) return "LOST_CLAIM"; throw error; }
}

/** One bounded pass; no scheduler or app startup hook. Default mode never changes DB/storage. */
export async function runMediaCleanup(db: PrismaClient, options: { bucket: string; limit?: number; store?: CleanupObjectStore; mode?: "dry-run" | "apply-isolated" }) {
  assertIsolatedCleanupBucket(options.bucket);
  const limit = options.limit ?? 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("CLEANUP_LIMIT_INVALID");
  const apply = options.mode === "apply-isolated";
  if (apply && (!options.store || options.store.bucketName !== options.bucket)) throw new Error("CLEANUP_STORE_MISMATCH");
  // Candidate discovery is read-only and uses DB time. Every execution rereads under asset locks.
  const candidates = await db.$queryRaw<{ kind: string; id: string }[]>`
    (SELECT 'expire' AS kind, u.id FROM media_uploads u JOIN media_files f ON f.id = u.file_id JOIN media_assets a ON a.id = f.asset_id
     WHERE f.bucket = ${options.bucket} AND a.layout = 'CANONICAL' AND a.retention_hold IS NULL AND a.scope <> 'UNCLASSIFIED'
       AND u.phase IN ('ISSUED','VALIDATING','PROMOTING') AND u.deadline_at <= clock_timestamp() AND (u.lease_expires_at IS NULL OR u.lease_expires_at <= clock_timestamp()) ORDER BY u.deadline_at, u.id LIMIT ${limit})
    UNION ALL
    (SELECT 'delete', a.id FROM media_deletion_jobs j JOIN media_assets a ON a.id = j.asset_id
     WHERE a.layout = 'CANONICAL' AND a.retention_hold IS NULL AND a.scope <> 'UNCLASSIFIED'
       AND EXISTS (SELECT 1 FROM media_files f WHERE f.asset_id = a.id AND f.bucket = ${options.bucket})
       AND ((j.status IN ('SCHEDULED','RETRY') AND j.next_attempt_at <= clock_timestamp()) OR (j.status = 'RUNNING' AND j.lease_expires_at <= clock_timestamp())) ORDER BY j.next_attempt_at, j.id LIMIT ${limit})
    UNION ALL
    (SELECT 'staging', f.id FROM media_uploads u JOIN media_files f ON f.id = u.file_id JOIN media_assets a ON a.id = f.asset_id
     WHERE f.bucket = ${options.bucket} AND a.layout = 'CANONICAL' AND a.retention_hold IS NULL AND a.scope <> 'UNCLASSIFIED'
       AND u.phase IN ('COMPLETED','ABANDONED') AND u.staging_cleanup_due_at <= clock_timestamp() ORDER BY u.staging_cleanup_due_at, u.id LIMIT ${limit})
    UNION ALL
    (SELECT 'file', f.id FROM media_files f JOIN media_assets a ON a.id = f.asset_id LEFT JOIN media_uploads u ON u.file_id = f.id
     WHERE f.bucket = ${options.bucket} AND a.layout = 'CANONICAL' AND a.retention_hold IS NULL AND a.scope <> 'UNCLASSIFIED'
       AND f.status IN ('RETIRED','DELETED') AND f.next_sweep_at <= clock_timestamp()
       AND (a.storage_status IN ('ABANDONED','DELETED') OR (a.storage_status = 'READY' AND f.role <> 'ORIGINAL' AND u.phase = 'ABANDONED')) ORDER BY f.next_sweep_at, f.id LIMIT ${limit})`;
  const results: { kind: string; id: string; outcome: string }[] = [];
  for (const candidate of candidates) {
    if (!apply) { results.push({ ...candidate, outcome: "CANDIDATE" }); continue; }
    try {
      const outcome = candidate.kind === "expire" ? (await expireMediaPreparation(db, candidate.id, options.bucket) ? "ABANDONED" : "SKIPPED")
        : candidate.kind === "delete" ? await processMediaDeletion(db, candidate.id, options.store!)
          : await sweepMediaObject(db, candidate.id, candidate.kind === "staging" ? "staging" : "file", options.store!);
      results.push({ ...candidate, outcome });
    } catch { results.push({ ...candidate, outcome: "WORKER_FAILED" }); }
  }
  return { mode: apply ? "apply-isolated" : "dry-run", results };
}
