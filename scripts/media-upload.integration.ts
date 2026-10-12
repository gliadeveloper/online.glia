import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import type { PrismaClient } from "../src/generated/prisma/client";
import { ApiError } from "../src/lib/api";
import { completeOriginalUpload, reserveOriginalUpload } from "../src/lib/media/prepare-upload";
import type { UploadObjectStore } from "../src/lib/media/r2-upload-store";
import { libraryMediaRule } from "../src/lib/media/content-signature";

type Check = (name: string, work: () => Promise<unknown>) => Promise<void>;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const errorCode = (code: string) => (error: unknown) => error instanceof ApiError && error.code === code;

function memoryStore(bucketName = "online-glia-dev") {
  const objects = new Map<string, { body: Buffer; contentType: string; etag: string }>();
  const presigned: string[] = [];
  const puts: string[] = [];
  const store: UploadObjectStore & { objects: typeof objects; presigned: string[]; puts: string[] } = {
    bucketName,
    objects,
    presigned,
    puts,
    async presignStagingPut(input) {
      if (!input.objectKey.startsWith("media/staging/")) throw new Error("presign left the staging prefix");
      presigned.push(input.objectKey);
      return `https://upload.example.invalid/${encodeURIComponent(input.objectKey)}`;
    },
    async head(objectKey) {
      const found = objects.get(objectKey);
      return found ? { byteSize: found.body.length, etag: found.etag } : null;
    },
    async materialize(input) {
      const found = objects.get(input.objectKey);
      if (!found) throw new ApiError("missing", 409, "MEDIA_STAGING_ABSENT");
      if (found.etag !== input.etag) throw new ApiError("changed", 409, "STAGING_CHANGED");
      if (found.body.length > input.maxBytes) throw new ApiError("large", 413, "MEDIA_TOO_LARGE");
      await writeFile(input.destPath, found.body);
    },
    async putIfAbsent(input) {
      puts.push(input.objectKey);
      if (objects.has(input.objectKey)) return "exists";
      const body = await readFile(input.sourcePath);
      objects.set(input.objectKey, { body, contentType: input.contentType, etag: etag(body) });
      return "created";
    },
  };
  return store;
}

function etag(body: Buffer) {
  return `"${createHash("md5").update(body).digest("hex")}"`;
}

function stage(store: ReturnType<typeof memoryStore>, key: string, body: Buffer) {
  store.objects.set(key, { body, contentType: "image/png", etag: etag(body) });
}

export async function runMediaUploadIntegration(db: PrismaClient, check: Check) {
  await db.user.create({ data: { id: "upload-coach", email: "upload-coach@example.invalid", role: "COACH" } });
  await db.user.create({ data: { id: "upload-admin", email: "upload-admin@example.invalid", role: "ADMIN" } });
  const reserve = (actorId: string, scope: "PERSONAL" | "SHARED", store: UploadObjectStore, idempotencyKey?: string) => reserveOriginalUpload(db, {
    actorId, scope, fileName: "lesson.png", contentType: "image/png", byteSize: PNG.length, idempotencyKey,
  }, store);

  await check("upload reserve: coach personal staging URL only, final key is not uploadable", async () => {
    const store = memoryStore();
    const reserved = await reserve("upload-coach", "PERSONAL", store, "idem-coach-1");
    const upload = await db.mediaUpload.findUniqueOrThrow({ where: { id: reserved.uploadId }, include: { file: { include: { asset: true } } } });
    assert.equal(reserved.status, "ISSUED");
    assert.equal(upload.file.asset.scope, "PERSONAL");
    assert.equal(upload.file.asset.ownerUserId, "upload-coach");
    assert.equal(upload.file.asset.storageStatus, "PENDING");
    assert.equal(upload.file.bucket, "online-glia-dev");
    assert.equal(upload.stagingObjectKey, `media/staging/${upload.id}/source.png`);
    assert.equal(upload.file.objectKey, `media/personal/upload-coach/${upload.file.assetId}/original.png`);
    assert.deepEqual(store.presigned, [upload.stagingObjectKey]);
    assert.equal(store.puts.length, 0);
    assert.equal(await db.mediaDeletionJob.count({ where: { assetId: reserved.assetId } }), 0);
  });

  await check("upload reserve: same idempotency key reuses the upload, a different file is rejected", async () => {
    const store = memoryStore();
    const first = await reserve("upload-coach", "PERSONAL", store, "idem-coach-2");
    const again = await reserve("upload-coach", "PERSONAL", store, "idem-coach-2");
    assert.equal(again.uploadId, first.uploadId);
    assert.equal(await db.mediaAsset.count({ where: { createdById: "upload-coach", originalName: "lesson.png" } }), 2);
    await assert.rejects(() => reserveOriginalUpload(db, {
      actorId: "upload-coach", scope: "PERSONAL", fileName: "other.png", contentType: "image/png", byteSize: PNG.length, idempotencyKey: "idem-coach-2",
    }, store), errorCode("IDEMPOTENCY_CONFLICT"));
  });

  await check("upload reserve: coach cannot create a shared asset, admin shared key has no owner", async () => {
    const store = memoryStore();
    await assert.rejects(() => reserve("upload-coach", "SHARED", store), errorCode("MEDIA_SCOPE_FORBIDDEN"));
    const reserved = await reserve("upload-admin", "SHARED", store);
    const upload = await db.mediaUpload.findUniqueOrThrow({ where: { id: reserved.uploadId }, include: { file: { include: { asset: true } } } });
    assert.equal(upload.file.asset.scope, "SHARED");
    assert.equal(upload.file.asset.ownerUserId, null);
    assert.equal(upload.file.objectKey, `media/shared/${upload.file.assetId}/original.png`);
  });

  await check("upload reserve: production bucket name is rejected before a row is created", async () => {
    const before = await db.mediaAsset.count();
    await assert.rejects(() => reserve("upload-coach", "PERSONAL", memoryStore("online-glia")), errorCode("R2_BUCKET_NOT_ISOLATED"));
    assert.equal(await db.mediaAsset.count(), before);
  });

  await check("upload complete: absent staging can be retried, then a valid file becomes READY once", async () => {
    const store = memoryStore();
    const reserved = await reserve("upload-coach", "PERSONAL", store);
    await assert.rejects(() => completeOriginalUpload(db, { actorId: "upload-coach", uploadId: reserved.uploadId }, store), errorCode("MEDIA_STAGING_ABSENT"));
    const upload = await db.mediaUpload.findUniqueOrThrow({ where: { id: reserved.uploadId }, include: { file: true } });
    stage(store, upload.stagingObjectKey, PNG);
    const completed = await completeOriginalUpload(db, { actorId: "upload-coach", uploadId: reserved.uploadId }, store);
    assert.equal(completed.status, "COMPLETED");
    assert.equal(completed.mediaUrl, `/api/media/r2?key=${encodeURIComponent(upload.file.urlKey)}`);
    assert.equal(store.puts.length, 1);
    assert.equal(store.objects.get(upload.file.objectKey)?.body.equals(PNG), true);
    const ready = await db.mediaAsset.findUniqueOrThrow({ where: { id: reserved.assetId }, include: { files: true } });
    assert.equal(ready.storageStatus, "READY");
    assert.equal(ready.files[0]?.status, "READY");
    assert.equal(await db.mediaDeletionJob.count({ where: { assetId: reserved.assetId } }), 0);
    const repeated = await completeOriginalUpload(db, { actorId: "upload-coach", uploadId: reserved.uploadId }, store);
    assert.equal(repeated.assetId, reserved.assetId);
    assert.equal(store.puts.length, 1);
  });

  await check("upload complete: mismatched bytes are abandoned and not published", async () => {
    const store = memoryStore();
    const reserved = await reserve("upload-coach", "PERSONAL", store);
    const upload = await db.mediaUpload.findUniqueOrThrow({ where: { id: reserved.uploadId } });
    stage(store, upload.stagingObjectKey, Buffer.from("this is not a png"));
    await assert.rejects(() => completeOriginalUpload(db, { actorId: "upload-coach", uploadId: reserved.uploadId }, store), errorCode("CONTENT_MISMATCH"));
    const asset = await db.mediaAsset.findUniqueOrThrow({ where: { id: reserved.assetId }, include: { files: true } });
    const finished = await db.mediaUpload.findUniqueOrThrow({ where: { id: reserved.uploadId } });
    assert.equal(asset.storageStatus, "ABANDONED");
    assert.equal(asset.files[0]?.status, "RETIRED");
    assert.equal(finished.phase, "ABANDONED");
    assert.equal(store.puts.length, 0);
  });

  await check("upload complete: a different final object is held and not overwritten", async () => {
    const store = memoryStore();
    const reserved = await reserve("upload-coach", "PERSONAL", store);
    const upload = await db.mediaUpload.findUniqueOrThrow({ where: { id: reserved.uploadId }, include: { file: true } });
    stage(store, upload.stagingObjectKey, PNG);
    const other = Buffer.from("different-final-object");
    stage(store, upload.file.objectKey, other);
    await assert.rejects(() => completeOriginalUpload(db, { actorId: "upload-coach", uploadId: reserved.uploadId }, store), errorCode("KEY_MISMATCH"));
    assert.equal(store.objects.get(upload.file.objectKey)?.body.equals(other), true);
    assert.equal(store.puts.length, 0);
    const asset = await db.mediaAsset.findUniqueOrThrow({ where: { id: reserved.assetId } });
    assert.equal(asset.storageStatus, "PENDING");
    assert.equal(asset.retentionHold, "KEY_MISMATCH");
    assert.equal(await db.mediaDeletionJob.count({ where: { assetId: reserved.assetId } }), 0);
  });

  await check("upload reserve: concurrent idempotency and expiry create exactly one new reservation", async () => {
    const store = memoryStore();
    const results = await Promise.all(Array.from({ length: 4 }, () => reserve("upload-coach", "PERSONAL", store, "concurrent-reserve")));
    assert.equal(new Set(results.map(r => r.uploadId)).size, 1);
    await db.idempotencyKey.update({ where: { key: "media-upload:upload-coach:concurrent-reserve" }, data: { expiresAt: new Date(0) } });
    const renewed = await reserve("upload-coach", "PERSONAL", store, "concurrent-reserve");
    assert.notEqual(renewed.uploadId, results[0].uploadId);
    assert(await db.mediaUpload.findUnique({ where: { id: results[0].uploadId } }));
    await assert.rejects(reserve("upload-coach", "PERSONAL", memoryStore("other-test-bucket"), "concurrent-reserve"), errorCode("MEDIA_BUCKET_MISMATCH"));
  });

  await check("upload validation: prototype MIME names and non-string input are rejected", async () => {
    for (const value of ["constructor", "__proto__", "toString", 123]) assert.equal(libraryMediaRule(value as string), null);
  });

  async function staged() {
    const store = memoryStore();
    const reserved = await reserve("upload-coach", "PERSONAL", store);
    const upload = await db.mediaUpload.findUniqueOrThrow({ where: { id: reserved.uploadId }, include: { file: true } });
    stage(store, upload.stagingObjectKey, PNG);
    return { store, reserved, upload, complete: () => completeOriginalUpload(db, { actorId: "upload-coach", uploadId: upload.id }, store) };
  }

  await check("upload complete: matching PNG header and length do not admit a corrupt body", async () => {
    const { store, upload, complete } = await staged();
    const corrupt = Buffer.from(PNG);
    corrupt.fill(0, 24);
    stage(store, upload.stagingObjectKey, corrupt);
    await assert.rejects(complete(), errorCode("CONTENT_MISMATCH"));
    assert.equal((await db.mediaFile.findUniqueOrThrow({ where: { id: upload.fileId } })).verifiedAt, null);
    assert.equal((await db.mediaUpload.findUniqueOrThrow({ where: { id: upload.id } })).phase, "ABANDONED");
    assert.equal(store.puts.length, 0);
  });

  await check("upload complete: wrong bucket and revoked editor are rejected before storage IO", async () => {
    const { store, upload, complete } = await staged();
    await assert.rejects(completeOriginalUpload(db, { actorId: "upload-coach", uploadId: upload.id }, memoryStore("other-test-bucket")), errorCode("MEDIA_BUCKET_MISMATCH"));
    await db.user.update({ where: { id: "upload-coach" }, data: { status: "SUSPENDED" } });
    try { await assert.rejects(complete(), errorCode("FORBIDDEN")); }
    finally { await db.user.update({ where: { id: "upload-coach" }, data: { status: "ACTIVE" } }); }
    assert.equal((await db.mediaUpload.findUniqueOrThrow({ where: { id: upload.id } })).phase, "ISSUED");
    assert.equal(store.puts.length, 0);
  });

  await check("upload complete: expired reservation commits abandonment and cleanup despite 409", async () => {
    const id = `expired-${Date.now()}`;
    await db.$transaction(async tx => {
      await tx.mediaAsset.create({ data: { id, scope: "PERSONAL", ownerUserId: "upload-coach", kind: "IMAGE", originalName: "expired.png", layout: "CANONICAL" } });
      const key = `media/personal/upload-coach/${id}/original.png`;
      await tx.mediaFile.create({ data: { id, assetId: id, role: "ORIGINAL", bucket: "online-glia-dev", objectKey: key, urlKey: key } });
      await tx.mediaUpload.create({ data: { id, fileId: id, requestedById: "upload-coach", sourceKind: "CLIENT", stagingObjectKey: `media/staging/${id}/source.png`, expectedMimeType: "image/png", expectedByteSize: BigInt(PNG.length), uploadExpiresAt: new Date(Date.now() - 120000), deadlineAt: new Date(Date.now() - 60000) } });
    });
    await assert.rejects(completeOriginalUpload(db, { actorId: "upload-coach", uploadId: id }, memoryStore()), errorCode("UPLOAD_ABANDONED"));
    const row = await db.mediaUpload.findUniqueOrThrow({ where: { id } });
    assert.equal(row.phase, "ABANDONED");
    assert(row.stagingCleanupDueAt);
    assert.equal((await db.mediaAsset.findUniqueOrThrow({ where: { id } })).storageStatus, "ABANDONED");
  });

  for (const change of ["expired", "replaced"] as const) await check(`upload complete: ${change} lease cannot pin validation or write final bytes`, async () => {
    const { store, upload, complete } = await staged();
    const materialize = store.materialize;
    store.materialize = async input => {
      await materialize(input);
      await db.mediaUpload.update({ where: { id: upload.id }, data: change === "expired" ? { leaseExpiresAt: new Date(0) } : { leaseToken: "another-worker" } });
    };
    await assert.rejects(complete(), errorCode("UPLOAD_IN_PROGRESS"));
    assert.equal((await db.mediaFile.findUniqueOrThrow({ where: { id: upload.fileId } })).verifiedAt, null);
    assert.equal(store.puts.length, 0);
  });

  await check("upload complete: late final PUT cannot publish; next lease verifies existing bytes without re-PUT", async () => {
    const { store, upload, complete } = await staged();
    const put = store.putIfAbsent;
    store.putIfAbsent = async input => {
      const result = await put(input);
      await db.mediaUpload.update({ where: { id: upload.id }, data: { leaseExpiresAt: new Date(0) } });
      return result;
    };
    await assert.rejects(complete(), errorCode("UPLOAD_IN_PROGRESS"));
    assert.equal((await db.mediaAsset.findUniqueOrThrow({ where: { id: upload.file.assetId } })).storageStatus, "PENDING");
    store.putIfAbsent = put;
    assert.equal((await complete()).status, "COMPLETED");
    assert.equal(store.puts.length, 1);
  });

  await check("upload complete: large final collision is held, even if bytes later match", async () => {
    const { store, upload, complete } = await staged();
    stage(store, upload.file.objectKey, Buffer.alloc(PNG.length + 10));
    await assert.rejects(complete(), errorCode("KEY_MISMATCH"));
    stage(store, upload.file.objectKey, PNG);
    await assert.rejects(complete(), errorCode("MEDIA_ON_HOLD"));
    assert.equal((await db.mediaAsset.findUniqueOrThrow({ where: { id: upload.file.assetId } })).storageStatus, "PENDING");
    assert.equal(store.puts.length, 0);
  });

  await check("upload complete: missing decoder stays retryable and cannot mark verified", async () => {
    const { upload, complete } = await staged();
    const old = process.env.MEDIA_FFPROBE_PATH;
    process.env.MEDIA_FFPROBE_PATH = "/nonexistent/glia-ffprobe";
    try { await assert.rejects(complete(), errorCode("MEDIA_VALIDATOR_UNAVAILABLE")); }
    finally { if (old === undefined) delete process.env.MEDIA_FFPROBE_PATH; else process.env.MEDIA_FFPROBE_PATH = old; }
    assert.equal((await db.mediaFile.findUniqueOrThrow({ where: { id: upload.fileId } })).verifiedAt, null);
    assert.equal((await complete()).status, "COMPLETED");
  });

  if (process.env.MEDIA_UPLOAD_LIVE === "1") {
    const { runMediaR2LiveIntegration } = await import("./media-r2-live.integration");
    await runMediaR2LiveIntegration(db, check);
  }
}
