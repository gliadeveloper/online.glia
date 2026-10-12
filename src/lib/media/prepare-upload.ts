import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, open, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api";

import { libraryMediaRule, matchesDeclaredSignature, type LibraryMediaKind, type LibraryMimeType } from "./content-signature";
import { assertUploadStoreAllowed, type UploadObjectStore } from "./r2-upload-store";
import { assertMediaEditor, withMediaTransaction } from "./usage-sync";
import { verifyMediaContent } from "./verify-content";

type Tx = Prisma.TransactionClient;
const UPLOAD_WINDOW_MS = 15 * 60 * 1000;
const DEADLINE_MS = 24 * 60 * 60 * 1000;

export type UploadScope = "PERSONAL" | "SHARED";
export type ReservedUpload = {
  uploadId: string;
  assetId: string;
  status: "ISSUED" | "VALIDATING" | "PROMOTING" | "COMPLETED" | "ABANDONED";
  uploadUrl: string | null;
  uploadHeaders: { "content-type": string; "content-length": string } | null;
  uploadExpiresAt: string;
  deadlineAt: string;
  mediaUrl: string | null;
};

type ReserveInput = {
  actorId: string;
  scope: UploadScope;
  fileName: string;
  contentType: string;
  byteSize: number;
  idempotencyKey?: string;
};

function newId() {
  return `c${Date.now().toString(36)}${randomBytes(8).toString("hex")}`;
}

function displayName(fileName: string) {
  if (typeof fileName !== "string") throw new ApiError("파일 이름이 올바르지 않습니다.", 400, "VALIDATION_ERROR");
  const base = fileName.split(/[/\\]/).pop()?.replace(/[\u0000-\u001f]/g, "").trim() ?? "";
  if (!base || base.length > 180 || base === "." || base === "..") {
    throw new ApiError("파일 이름이 올바르지 않습니다.", 400, "VALIDATION_ERROR");
  }
  return base;
}

function requestedFile(input: ReserveInput) {
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize < 1) {
    throw new ApiError("파일 크기가 올바르지 않습니다.", 400, "VALIDATION_ERROR");
  }
  const rule = libraryMediaRule(input.contentType ?? "");
  if (!rule) throw new ApiError("지원하지 않는 파일 형식입니다.", 400, "MEDIA_TYPE_REJECTED");
  if (input.byteSize > rule.maxBytes) throw new ApiError("파일이 허용 용량을 초과했습니다.", 413, "MEDIA_TOO_LARGE");
  const originalName = displayName(input.fileName ?? "");
  return { ...rule, originalName, byteSize: input.byteSize };
}

function fingerprint(input: { scope: UploadScope; originalName: string; mimeType: string; byteSize: number }) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function idempotencyStorageKey(actorId: string, clientKey: string) {
  if (!/^[A-Za-z0-9._:-]{8,80}$/.test(clientKey)) {
    throw new ApiError("멱등 키가 올바르지 않습니다.", 400, "VALIDATION_ERROR");
  }
  return `media-upload:${actorId}:${clientKey}`;
}

async function dbNow(tx: Tx) {
  const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  return now;
}

async function hashFile(filePath: string) {
  const hash = createHash("sha256");
  let byteSize = 0;
  for await (const chunk of createReadStream(filePath)) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteSize += buffer.length;
    hash.update(buffer);
  }
  return { byteSize, sha256: hash.digest("hex") };
}

function mediaUrlFor(urlKey: string) {
  return `/api/media/r2?key=${encodeURIComponent(urlKey)}`;
}

async function presignRemaining(store: UploadObjectStore, upload: { stagingObjectKey: string; expectedMimeType: string; expectedByteSize: bigint | null; uploadExpiresAt: Date }, now: Date) {
  const expiresInSeconds = Math.floor((upload.uploadExpiresAt.getTime() - now.getTime()) / 1000);
  if (expiresInSeconds < 1 || upload.expectedByteSize == null) return null;
  const uploadUrl = await store.presignStagingPut({
    objectKey: upload.stagingObjectKey,
    contentType: upload.expectedMimeType,
    byteSize: Number(upload.expectedByteSize),
    expiresInSeconds,
  });
  return {
    uploadUrl,
    uploadHeaders: { "content-type": upload.expectedMimeType, "content-length": upload.expectedByteSize.toString() },
  };
}

function reservedFrom(upload: { id: string; phase: string; uploadExpiresAt: Date; deadlineAt: Date; file: { assetId: string; urlKey: string; status: string } }, signed: { uploadUrl: string; uploadHeaders: { "content-type": string; "content-length": string } } | null): ReservedUpload {
  const completed = upload.phase === "COMPLETED" && upload.file.status === "READY";
  return {
    uploadId: upload.id,
    assetId: upload.file.assetId,
    status: upload.phase as ReservedUpload["status"],
    uploadUrl: completed ? null : signed?.uploadUrl ?? null,
    uploadHeaders: completed ? null : signed?.uploadHeaders ?? null,
    uploadExpiresAt: upload.uploadExpiresAt.toISOString(),
    deadlineAt: upload.deadlineAt.toISOString(),
    mediaUrl: completed ? mediaUrlFor(upload.file.urlKey) : null,
  };
}

async function loadUpload(tx: Tx, uploadId: string) {
  const upload = await tx.mediaUpload.findUnique({ where: { id: uploadId }, include: { file: { include: { asset: true } } } });
  if (!upload) throw new ApiError("업로드를 찾지 못했습니다.", 404, "UPLOAD_NOT_FOUND");
  return upload;
}

function assertBucket(upload: Awaited<ReturnType<typeof loadUpload>>, store: UploadObjectStore) {
  assertUploadStoreAllowed(store);
  if (upload.file.bucket !== store.bucketName) {
    throw new ApiError("예약한 저장소와 현재 저장소가 다릅니다.", 503, "MEDIA_BUCKET_MISMATCH");
  }
}

async function assertUploadActor(tx: Tx, upload: Awaited<ReturnType<typeof loadUpload>>, actorId: string) {
  const actor = await assertMediaEditor(tx, actorId);
  if (upload.file.asset.scope === "SHARED" && actor.role !== "ADMIN") throw new ApiError("공통 자료는 관리자만 등록할 수 있습니다.", 403, "MEDIA_SCOPE_FORBIDDEN");
}

function assertLease(upload: Awaited<ReturnType<typeof loadUpload>>, token: string, now: Date, phase?: string) {
  if (upload.leaseToken !== token || !upload.leaseExpiresAt || upload.leaseExpiresAt <= now || upload.deadlineAt <= now ||
      !["VALIDATING", "PROMOTING"].includes(upload.phase) || (phase && upload.phase !== phase) ||
      upload.file.status !== "PENDING" || upload.file.asset.storageStatus !== "PENDING") {
    throw new ApiError("업로드 처리 권한이 만료되었습니다. 다시 시도해 주세요.", 409, "UPLOAD_IN_PROGRESS");
  }
  if (upload.file.asset.retentionHold) throw new ApiError("검토가 필요한 파일입니다.", 409, "MEDIA_ON_HOLD");
}

export async function reserveOriginalUpload(db: PrismaClient, input: ReserveInput, store: UploadObjectStore): Promise<ReservedUpload> {
  const file = requestedFile(input);
  if (input.scope !== "PERSONAL" && input.scope !== "SHARED") {
    throw new ApiError("보관 구분이 올바르지 않습니다.", 400, "VALIDATION_ERROR");
  }
  const requestFingerprint = fingerprint({ scope: input.scope, originalName: file.originalName, mimeType: file.mimeType, byteSize: file.byteSize });
  const storageKey = input.idempotencyKey ? idempotencyStorageKey(input.actorId, input.idempotencyKey) : null;
  assertUploadStoreAllowed(store);

  const created = await withMediaTransaction(db, async tx => {
    await assertMediaEditor(tx, input.actorId, input.scope === "PERSONAL" ? input.actorId : undefined);
    if (input.scope === "SHARED") {
      const actor = await tx.user.findUnique({ where: { id: input.actorId }, select: { role: true } });
      if (actor?.role !== "ADMIN") throw new ApiError("공통 자료는 관리자만 등록할 수 있습니다.", 403, "MEDIA_SCOPE_FORBIDDEN");
    }
    if (storageKey) {
      // Serializes absent rows too. Never include the lock's void result in Prisma deserialization.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${storageKey}, 0))`;
    }
    const now = await dbNow(tx);
    if (storageKey) {
      const existing = await tx.idempotencyKey.findUnique({ where: { key: storageKey } });
      const saved = existing?.response as { fingerprint?: string; uploadId?: string } | null;
      if (existing && existing.expiresAt > now && saved?.uploadId) {
        if (saved.fingerprint !== requestFingerprint) throw new ApiError("같은 멱등 키로 다른 파일을 요청했습니다.", 409, "IDEMPOTENCY_CONFLICT");
        return { uploadId: saved.uploadId, replay: true };
      }
      if (existing) await tx.idempotencyKey.delete({ where: { key: storageKey } });
    }

    const assetId = newId();
    const fileId = newId();
    const uploadId = newId();
    const extension = file.ext;
    const objectKey = input.scope === "SHARED"
      ? `media/shared/${assetId}/original.${extension}`
      : `media/personal/${input.actorId}/${assetId}/original.${extension}`;
    const uploadExpiresAt = new Date(now.getTime() + UPLOAD_WINDOW_MS);
    const deadlineAt = new Date(now.getTime() + DEADLINE_MS);
    await tx.mediaAsset.create({ data: {
      id: assetId,
      scope: input.scope,
      ownerUserId: input.scope === "PERSONAL" ? input.actorId : null,
      createdById: input.actorId,
      kind: file.kind as LibraryMediaKind,
      originalName: file.originalName,
      layout: "CANONICAL",
    } });
    await tx.mediaFile.create({ data: {
      id: fileId,
      assetId,
      role: "ORIGINAL",
      bucket: store.bucketName,
      objectKey,
      urlKey: objectKey,
    } });
    await tx.mediaUpload.create({ data: {
      id: uploadId,
      fileId,
      requestedById: input.actorId,
      sourceKind: "CLIENT",
      stagingObjectKey: `media/staging/${uploadId}/source.${extension}`,
      expectedMimeType: file.mimeType,
      expectedByteSize: BigInt(file.byteSize),
      uploadExpiresAt,
      deadlineAt,
    } });
    await tx.auditLog.create({ data: {
      actorId: input.actorId,
      entityType: "MediaUpload",
      entityId: uploadId,
      action: "MEDIA_UPLOAD_RESERVED",
      metadata: { assetId, scope: input.scope, kind: file.kind },
    } });
    if (storageKey) {
      await tx.idempotencyKey.create({ data: {
        key: storageKey,
        scope: "media-upload",
        response: { fingerprint: requestFingerprint, uploadId, assetId },
        expiresAt: deadlineAt,
      } });
    }
    return { uploadId, replay: false };
  });

  return withMediaTransaction(db, async tx => {
    const upload = await loadUpload(tx, created.uploadId);
    if (upload.requestedById !== input.actorId) throw new ApiError("업로드를 찾지 못했습니다.", 404, "UPLOAD_NOT_FOUND");
    assertBucket(upload, store);
    await assertUploadActor(tx, upload, input.actorId);
    const now = await dbNow(tx);
    const signed = upload.phase === "ISSUED" ? await presignRemaining(store, upload, now) : null;
    return reservedFrom(upload, signed);
  });
}

async function lockUpload(tx: Tx, uploadId: string, actorId: string) {
  const preview = await tx.mediaUpload.findUnique({ where: { id: uploadId }, select: { requestedById: true, file: { select: { id: true, assetId: true } } } });
  if (!preview || preview.requestedById !== actorId) throw new ApiError("업로드를 찾지 못했습니다.", 404, "UPLOAD_NOT_FOUND");
  await tx.$queryRaw`SELECT id FROM media_assets WHERE id = ${preview.file.assetId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM media_files WHERE id = ${preview.file.id} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM media_uploads WHERE id = ${uploadId} FOR UPDATE`;
  return loadUpload(tx, uploadId);
}

async function abandonLocked(tx: Tx, upload: { id: string; fileId: string; requestedById: string | null; file: { assetId: string } }, code: string) {
  const now = await dbNow(tx);
  const updated = await tx.mediaUpload.updateMany({
    where: { id: upload.id, phase: { in: ["ISSUED", "VALIDATING", "PROMOTING"] }, OR: [{ phase: "ISSUED" }, { leaseExpiresAt: { lte: now } }, { leaseToken: null }] },
    data: { phase: "ABANDONED", abandonedAt: now, stagingCleanupDueAt: now, leaseToken: null, leaseExpiresAt: null, lastError: code },
  });
  if (updated.count !== 1) throw new ApiError("업로드 처리가 이미 진행 중입니다.", 409, "UPLOAD_IN_PROGRESS");
  await tx.mediaFile.update({ where: { id: upload.fileId }, data: { status: "RETIRED", cleanupRequestedAt: now, nextSweepAt: now } });
  await tx.mediaAsset.update({ where: { id: upload.file.assetId }, data: { storageStatus: "ABANDONED" } });
  await tx.auditLog.create({ data: { actorId: upload.requestedById, entityType: "MediaUpload", entityId: upload.id, action: "MEDIA_UPLOAD_ABANDONED", metadata: { code } } });
}

export async function completeOriginalUpload(db: PrismaClient, input: { actorId: string; uploadId: string }, store: UploadObjectStore): Promise<ReservedUpload> {
  const claim = await withMediaTransaction(db, async tx => {
    const locked = await lockUpload(tx, input.uploadId, input.actorId);
    assertBucket(locked, store);
    await assertUploadActor(tx, locked, input.actorId);
    if (locked.phase === "COMPLETED") {
      if (locked.file.status !== "READY" || locked.file.asset.storageStatus !== "READY") throw new ApiError("더 이상 사용할 수 없는 파일입니다.", 409, "UPLOAD_ABANDONED");
      return { kind: "done" as const, uploadId: locked.id };
    }
    if (locked.phase === "ABANDONED") throw new ApiError("만료되었거나 거절된 업로드입니다.", 409, "UPLOAD_ABANDONED");
    const now = await dbNow(tx);
    if (locked.deadlineAt <= now) {
      await abandonLocked(tx, locked, "DEADLINE");
      return { kind: "expired" as const };
    }
    if (locked.file.asset.retentionHold) throw new ApiError("검토가 필요한 파일입니다.", 409, "MEDIA_ON_HOLD");
    const token = randomBytes(16).toString("hex");
    const claimed = await tx.$queryRaw<{ id: string }[]>`
      UPDATE media_uploads SET
        phase = CASE WHEN phase = 'ISSUED' THEN 'VALIDATING' ELSE phase END,
        lease_token = ${token},
        lease_expires_at = clock_timestamp() + interval '5 minutes',
        attempt_count = attempt_count + 1,
        updated_at = clock_timestamp()
      WHERE id = ${locked.id}
        AND deadline_at > clock_timestamp()
        AND (
          phase = 'ISSUED'
          OR (phase IN ('VALIDATING', 'PROMOTING') AND lease_expires_at <= clock_timestamp())
        )
      RETURNING id`;
    if (!claimed.length) throw new ApiError("업로드 처리가 이미 진행 중입니다.", 409, "UPLOAD_IN_PROGRESS");
    return { kind: "claimed" as const, token, uploadId: locked.id };
  });
  if (claim.kind === "expired") throw new ApiError("만료되었거나 거절된 업로드입니다.", 409, "UPLOAD_ABANDONED");
  if (claim.kind === "done") {
    return withMediaTransaction(db, async tx => reservedFrom(await loadUpload(tx, claim.uploadId), null));
  }

  const workDirectory = await mkdtemp(path.join(os.tmpdir(), "glia-media-"));
  const downloaded = path.join(workDirectory, "source");
  try {
    const snapshot = await withMediaTransaction(db, tx => loadUpload(tx, claim.uploadId));
    if (snapshot.leaseToken !== claim.token) throw new ApiError("업로드 처리가 이미 진행 중입니다.", 409, "UPLOAD_IN_PROGRESS");
    if (snapshot.phase === "VALIDATING") await validateStaging(db, store, snapshot, claim.token, downloaded);
    await publishFinal(db, store, claim.uploadId, claim.token, downloaded);
    return withMediaTransaction(db, async tx => reservedFrom(await loadUpload(tx, claim.uploadId), null));
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
}

async function validateStaging(db: PrismaClient, store: UploadObjectStore, upload: Awaited<ReturnType<typeof loadUpload>>, token: string, downloaded: string) {
  const expected = Number(upload.expectedByteSize);
  const head = await store.head(upload.stagingObjectKey);
  if (!head) {
    await expireLease(db, upload.id, token, "MEDIA_STAGING_ABSENT");
    throw new ApiError("업로드된 파일을 찾지 못했습니다. 올린 뒤 다시 완료해 주세요.", 409, "MEDIA_STAGING_ABSENT");
  }
  if (head.byteSize !== expected) {
    await abandonWithLease(db, upload.id, token, "CONTENT_MISMATCH");
    throw new ApiError("업로드한 파일 크기가 요청과 다릅니다.", 422, "CONTENT_MISMATCH");
  }
  await store.materialize({ objectKey: upload.stagingObjectKey, etag: head.etag, maxBytes: expected, destPath: downloaded });
  const header = Buffer.alloc(16);
  const handle = await open(downloaded, "r");
  try { await handle.read(header, 0, 16, 0); }
  finally { await handle.close(); }
  const mimeType = upload.expectedMimeType as LibraryMimeType;
  if (!matchesDeclaredSignature(mimeType, header)) {
    await abandonWithLease(db, upload.id, token, "CONTENT_MISMATCH");
    throw new ApiError("파일 내용이 선언한 형식과 일치하지 않습니다.", 422, "CONTENT_MISMATCH");
  }
  try { await verifyMediaContent(downloaded, mimeType); }
  catch (error) {
    if (error instanceof ApiError && error.status === 422) await abandonWithLease(db, upload.id, token, error.code ?? "CONTENT_MISMATCH");
    else await expireLease(db, upload.id, token, "MEDIA_VALIDATOR_UNAVAILABLE");
    throw error;
  }
  const hashed = await hashFile(downloaded);
  if (hashed.byteSize !== expected) {
    await abandonWithLease(db, upload.id, token, "CONTENT_MISMATCH");
    throw new ApiError("파일 내용이 선언한 형식과 일치하지 않습니다.", 422, "CONTENT_MISMATCH");
  }
  const pinned = await withMediaTransaction(db, async tx => {
    const locked = await lockUpload(tx, upload.id, upload.requestedById!);
    const now = await dbNow(tx);
    assertLease(locked, token, now, "VALIDATING");
    await assertUploadActor(tx, locked, upload.requestedById!);
    const verified = await tx.mediaFile.updateMany({ where: { id: upload.fileId, status: "PENDING", verifiedAt: null }, data: {
      mimeType,
      byteSize: BigInt(hashed.byteSize),
      sha256: hashed.sha256,
      metadataCheckedAt: now,
      verifiedAt: now,
    } });
    if (verified.count !== 1) throw new ApiError("이미 다른 요청이 검증했습니다.", 409, "UPLOAD_IN_PROGRESS");
    const updated = await tx.$executeRaw`
      UPDATE media_uploads SET phase = 'PROMOTING', source_etag = ${head.etag},
        validated_at = clock_timestamp(), lease_expires_at = clock_timestamp() + interval '5 minutes', updated_at = clock_timestamp()
      WHERE id = ${upload.id} AND lease_token = ${token} AND phase = 'VALIDATING' AND source_etag IS NULL
        AND lease_expires_at > clock_timestamp() AND deadline_at > clock_timestamp()`;
    if (updated !== 1) throw new ApiError("업로드 처리 권한이 변경되었습니다.", 409, "UPLOAD_IN_PROGRESS");
    return true;
  });
  if (!pinned) throw new ApiError("업로드 처리가 이미 진행 중입니다.", 409, "UPLOAD_IN_PROGRESS");
}

async function publishFinal(db: PrismaClient, store: UploadObjectStore, uploadId: string, token: string, downloaded: string) {
  const upload = await withMediaTransaction(db, async tx => {
    const locked = await lockUpload(tx, uploadId, (await loadUpload(tx, uploadId)).requestedById!);
    assertLease(locked, token, await dbNow(tx), "PROMOTING");
    await assertUploadActor(tx, locked, locked.requestedById!);
    return locked;
  });
  if (upload.phase !== "PROMOTING" || !upload.file.sha256 || !upload.sourceEtag) {
    throw new ApiError("업로드 검증이 끝나지 않았습니다.", 409, "UPLOAD_IN_PROGRESS");
  }
  const pinnedSha = upload.file.sha256;
  const pinnedSize = Number(upload.file.byteSize);
  let finalHead = await store.head(upload.file.objectKey);
  if (!finalHead) {
    let sourceAvailable = true;
    try {
      await store.materialize({ objectKey: upload.stagingObjectKey, etag: upload.sourceEtag, maxBytes: pinnedSize, destPath: downloaded });
      const again = await hashFile(downloaded);
      sourceAvailable = again.sha256 === pinnedSha && again.byteSize === pinnedSize;
    } catch (error) {
      if (error instanceof ApiError && error.code === "STAGING_CHANGED") sourceAvailable = false;
      else throw error;
    }
    if (!sourceAvailable) {
      await abandonWithLease(db, uploadId, token, "STAGING_CHANGED");
      throw new ApiError("검증한 파일 내용이 바뀌었습니다.", 409, "STAGING_CHANGED");
    }
    await withMediaTransaction(db, async tx => {
      const locked = await lockUpload(tx, uploadId, upload.requestedById!);
      assertLease(locked, token, await dbNow(tx), "PROMOTING");
      await assertUploadActor(tx, locked, upload.requestedById!);
    });
    const wrote = await store.putIfAbsent({ objectKey: upload.file.objectKey, contentType: upload.file.mimeType!, sourcePath: downloaded });
    finalHead = await store.head(upload.file.objectKey);
    if (!finalHead) {
      await expireLease(db, uploadId, token, wrote === "created" ? "FINAL_UNCONFIRMED" : "FINAL_ABSENT");
      throw new ApiError("최종 파일을 확인하지 못했습니다. 다시 시도해 주세요.", 503, "UPLOAD_RESULT_UNKNOWN");
    }
  }
  const confirmed = path.join(path.dirname(downloaded), "final");
  let matches = finalHead.byteSize === pinnedSize;
  if (matches) {
    await store.materialize({ objectKey: upload.file.objectKey, etag: finalHead.etag, maxBytes: pinnedSize, destPath: confirmed });
    const finalHash = await hashFile(confirmed);
    matches = finalHash.sha256 === pinnedSha && finalHash.byteSize === pinnedSize;
  }
  if (!matches) {
    await withMediaTransaction(db, async tx => {
      const locked = await lockUpload(tx, uploadId, upload.requestedById!);
      assertLease(locked, token, await dbNow(tx), "PROMOTING");
      const held = await tx.mediaAsset.updateMany({ where: { id: upload.file.assetId, storageStatus: "PENDING", retentionHold: null }, data: { retentionHold: "KEY_MISMATCH" } });
      if (held.count === 1) {
        await tx.auditLog.create({ data: { entityType: "MediaAsset", entityId: upload.file.assetId, action: "MEDIA_UPLOAD_KEY_MISMATCH", metadata: { uploadId } } });
      }
    });
    throw new ApiError("최종 위치에 다른 파일이 있어 공개하지 않았습니다.", 409, "KEY_MISMATCH");
  }
  const ready = await withMediaTransaction(db, async tx => {
    const locked = await lockUpload(tx, uploadId, upload.requestedById!);
    const now = await dbNow(tx);
    assertLease(locked, token, now, "PROMOTING");
    await assertUploadActor(tx, locked, upload.requestedById!);
    const completed = await tx.$executeRaw`
      UPDATE media_uploads SET phase = 'COMPLETED', completed_at = clock_timestamp(),
        staging_cleanup_due_at = clock_timestamp(), lease_token = NULL, lease_expires_at = NULL,
        last_error = NULL, updated_at = clock_timestamp()
      WHERE id = ${uploadId} AND lease_token = ${token} AND phase = 'PROMOTING'
        AND deadline_at > clock_timestamp() AND lease_expires_at > clock_timestamp()`;
    if (completed !== 1) throw new ApiError("업로드 처리 권한이 변경되었습니다.", 409, "UPLOAD_IN_PROGRESS");
    await tx.mediaFile.update({ where: { id: upload.fileId }, data: { status: "READY", etag: finalHead.etag } });
    await tx.mediaAsset.update({ where: { id: upload.file.assetId }, data: { storageStatus: "READY" } });
    await tx.auditLog.create({ data: { actorId: upload.requestedById, entityType: "MediaUpload", entityId: uploadId, action: "MEDIA_UPLOAD_COMPLETED", metadata: { assetId: upload.file.assetId } } });
    return true;
  });
  if (!ready) throw new ApiError("업로드 처리가 이미 진행 중입니다.", 409, "UPLOAD_IN_PROGRESS");
}

async function expireLease(db: PrismaClient, uploadId: string, token: string, code: string) {
  await withMediaTransaction(db, async tx => {
    const preview = await loadUpload(tx, uploadId);
    await lockUpload(tx, uploadId, preview.requestedById!);
    await tx.$executeRaw`
    UPDATE media_uploads SET lease_expires_at = clock_timestamp(), last_error = ${code}, updated_at = clock_timestamp()
    WHERE id = ${uploadId} AND lease_token = ${token} AND lease_expires_at > clock_timestamp()
      AND phase IN ('VALIDATING', 'PROMOTING')`;
  });
}

async function abandonWithLease(db: PrismaClient, uploadId: string, token: string, code: string) {
  await withMediaTransaction(db, async tx => {
    const preview = await loadUpload(tx, uploadId);
    const upload = await lockUpload(tx, uploadId, preview.requestedById!);
    const now = await dbNow(tx);
    assertLease(upload, token, now);
    const updated = await tx.mediaUpload.updateMany({
      where: { id: uploadId, leaseToken: token, leaseExpiresAt: { gt: now }, phase: { in: ["VALIDATING", "PROMOTING"] } },
      data: { phase: "ABANDONED", abandonedAt: now, stagingCleanupDueAt: now, leaseToken: null, leaseExpiresAt: null, lastError: code },
    });
    if (updated.count !== 1) return;
    await tx.mediaFile.update({ where: { id: upload.fileId }, data: { status: "RETIRED", cleanupRequestedAt: now, nextSweepAt: now } });
    await tx.mediaAsset.update({ where: { id: upload.file.assetId }, data: { storageStatus: "ABANDONED" } });
    await tx.auditLog.create({ data: { actorId: upload.requestedById, entityType: "MediaUpload", entityId: uploadId, action: "MEDIA_UPLOAD_ABANDONED", metadata: { code } } });
  });
}
