import assert from "node:assert/strict";
import type { PrismaClient } from "../src/generated/prisma/client";
import { ApiError } from "../src/lib/api";
import { listMediaLibrary, libraryMediaUrl } from "../src/lib/media/library";
import { resolveMediaLocation } from "../src/lib/media/media-location";
import { createMediaGetHandler } from "../src/lib/media/media-delivery";
import { getR2Object } from "../src/lib/media/r2";

type Check = (name: string, work: () => Promise<unknown>) => Promise<void>;
const errorCode = (code: string) => (error: unknown) => error instanceof ApiError && error.code === code;
const courseId = "00000000-0000-4000-8000-000000000001";

export async function runMediaLibraryIntegration(db: PrismaClient, check: Check) {
  async function asset(scope = "SHARED", ownerUserId?: string, urlKey?: string, objectKey?: string) {
    return db.$transaction(async tx => {
      const asset = await tx.mediaAsset.create({ data: { scope, ownerUserId, kind: "IMAGE", originalName: "library-test.png", layout: "LEGACY" } });
      const key = objectKey ?? `courses/${courseId}/lessons/library/images/${asset.id}.png`;
      const file = await tx.mediaFile.create({ data: { assetId: asset.id, role: "ORIGINAL", bucket: "library-test", objectKey: key, urlKey: urlKey ?? key } });
      await tx.mediaFile.update({ where: { id: file.id }, data: { status: "READY", mimeType: "image/png", byteSize: BigInt(10), sha256: "a".repeat(64), verifiedAt: new Date(), metadataCheckedAt: new Date() } });
      await tx.mediaAsset.update({ where: { id: asset.id }, data: { storageStatus: "READY" } });
      return { ...asset, file };
    });
  }
  const shared = await asset();
  const own = await asset("PERSONAL", "teacher");
  const other = await asset("PERSONAL", "owner");
  const unknown = await asset("UNCLASSIFIED");
  const parent = await db.module.create({ data: { courseId, title: "Library access" } });
  const lesson = await db.lesson.create({ data: { moduleId: parent.id, title: "Library access" } });
  const content = await db.content.create({ data: { lessonId: lesson.id, type: "HTML", body: "fixture" } });
  const enrolled = await db.enrollment.create({ data: { userId: "student", courseId } });
  const resolve = (actorId: string, key: string, suffix = "", bucket = "library-test") => resolveMediaLocation(db, new URL(`https://app.example.invalid${libraryMediaUrl(key)}${suffix}`), async () => actorId, bucket);
  const denied = (actorId: string, key: string, suffix = "") => assert.rejects(resolve(actorId, key, suffix), errorCode("MEDIA_NOT_FOUND"));

  await check("media library: own and shared lists exclude other owners, unclassified and non-editors", async () => {
    const mine = await listMediaLibrary(db, "teacher");
    assert(mine.items.some(i => i.id === own.id));
    assert(!mine.items.some(i => [other.id, shared.id, unknown.id].includes(i.id)));
    const common = await listMediaLibrary(db, "teacher", { scope: "SHARED" });
    assert(common.items.some(i => i.id === shared.id));
    assert(!common.items.some(i => [other.id, own.id, unknown.id].includes(i.id)));
    assert(common.items.every(i => i.files.every(f => f.url.startsWith("/api/media/r2?key=") && typeof f.byteSize === "string")));
    await assert.rejects(listMediaLibrary(db, "student"), errorCode("FORBIDDEN"));
    assert(!(await listMediaLibrary(db, "media-admin")).items.some(i => i.id === other.id));
  });

  await check("media library: bounded pagination has no duplicates and keeps ownership filters", async () => {
    const sameMillisecond = [await asset("PERSONAL", "teacher"), await asset("PERSONAL", "teacher"), await asset("PERSONAL", "teacher")];
    for (const row of sameMillisecond) await db.$executeRaw`UPDATE media_assets SET created_at = '2026-10-08T12:00:00.123456Z'::timestamptz WHERE id = ${row.id}`;
    const ids: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await listMediaLibrary(db, "teacher", { limit: 2, cursor });
      ids.push(...page.items.map(i => i.id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    assert.equal(new Set(ids).size, ids.length);
    assert(ids.includes(own.id) && !ids.includes(other.id));
    assert(sameMillisecond.every(row => ids.includes(row.id)), "timestamp microseconds must not drop rows at page boundaries");
    for (const options of [{ limit: 101 }, { limit: NaN }, { scope: "UNCLASSIFIED" }, { cursor: "garbage" }]) {
      await assert.rejects(listMediaLibrary(db, "teacher", options), errorCode("VALIDATION_ERROR"));
    }
  });

  await check("media preview: owner/shared selector allowed, other personal and unknown owner denied", async () => {
    assert.equal((await resolve("teacher", own.file.urlKey)).isPublic, false);
    await resolve("teacher", shared.file.urlKey);
    await denied("teacher", other.file.urlKey);
    await denied("media-admin", other.file.urlKey);
    await denied("media-admin", unknown.file.urlKey);
    await denied("student", shared.file.urlKey);
  });

  await check("media playback: actual course usage admits enrollment without exposing personal library", async () => {
    for (const asset of [other, unknown]) await db.mediaUsage.create({ data: { assetId: asset.id, contentId: content.id, occurrenceCount: 1 } });
    await resolve("student", other.file.urlKey);
    await resolve("student", unknown.file.urlKey, `&contentId=${content.id}`);
    await denied("student", shared.file.urlKey, `&contentId=${content.id}`);
    await denied("teacher", own.file.urlKey, `&contentId=${content.id}`);
    await denied("student", other.file.urlKey, "&contentId=missing");
  });

  await check("media playback: elapsed, future, suspended and dropped enrollment windows are rejected", async () => {
    const deniedAccess = () => denied("student", other.file.urlKey);
    await db.enrollment.update({ where: { id: enrolled.id }, data: { validUntil: new Date(0) } });
    await deniedAccess();
    await db.enrollment.update({ where: { id: enrolled.id }, data: { validUntil: null, validFrom: new Date(Date.now() + 3600000) } });
    await deniedAccess();
    for (const status of ["SUSPENDED", "DROPPED", "EXPIRED"] as const) {
      await db.enrollment.update({ where: { id: enrolled.id }, data: { validFrom: new Date(0), status } });
      await deniedAccess();
    }
    await db.enrollment.update({ where: { id: enrolled.id }, data: { status: "COMPLETED" } });
    await resolve("student", other.file.urlKey);
  });

  await check("media playback: coaching draft denied, published history retained after entitlement expiry", async () => {
    const entitlement = await db.coachingEntitlement.create({ data: { userId: "student", coachId: "teacher", coachingOfferingId: "offering", totalSessions: 1, validUntil: new Date(0) } });
    const session = await db.coachingSession.create({ data: { entitlementId: entitlement.id, coachId: "teacher", userId: "student", sessionNo: 1, title: "Library", scheduledAt: new Date() } });
    await db.mediaUsage.create({ data: { assetId: shared.id, coachingSessionId: session.id, occurrenceCount: 1 } });
    const suffix = `&coachingSessionId=${session.id}`;
    await denied("student", shared.file.urlKey, suffix);
    await resolve("teacher", shared.file.urlKey, suffix);
    await db.coachingSession.update({ where: { id: session.id }, data: { publicationStatus: "PUBLISHED" } });
    await resolve("student", shared.file.urlKey, suffix);
    await denied("owner", shared.file.urlKey, suffix);
  });

  await check("media trash: selection hidden, existing usage retained, preview limited to owner/admin", async () => {
    for (const asset of [own, other, shared]) await db.mediaAsset.update({ where: { id: asset.id }, data: { libraryStatus: "TRASHED", trashedAt: new Date(), trashExpiresAt: new Date(Date.now() + 86400000) } });
    assert(!(await listMediaLibrary(db, "teacher")).items.some(i => i.id === own.id));
    await resolve("teacher", own.file.urlKey);
    await resolve("student", other.file.urlKey);
    // Teacher can still play the shared asset through their coaching usage.
    await denied("owner", shared.file.urlKey);
    await resolve("media-admin", shared.file.urlKey);
    await denied("teacher", other.file.urlKey, "&contentId=missing");
  });

  await check("media resolver: registered URL maps physical key, mismatched bucket is never substituted", async () => {
    const mapped = await asset("PERSONAL", "teacher", "media/personal/teacher/logical/original.png");
    const result = await resolve("teacher", mapped.file.urlKey);
    assert.equal(result.objectKey, mapped.file.objectKey);
    await assert.rejects(resolve("teacher", mapped.file.urlKey, "", "another-bucket"), errorCode("MEDIA_BUCKET_MISMATCH"));
    await denied("media-admin", "media/shared/unregistered/original.png");
    await denied("media-admin", "media/staging/x/source.png");
  });

  await check("media resolver: retired registered legacy never falls back to path ownership", async () => {
    const retired = await asset();
    await db.$transaction(async tx => {
      await tx.mediaAsset.update({ where: { id: retired.id }, data: { libraryStatus: "TRASHED", trashedAt: new Date(), trashExpiresAt: new Date() } });
      const job = await tx.mediaDeletionJob.create({ data: { assetId: retired.id, nextAttemptAt: new Date() } });
      await tx.mediaFile.update({ where: { id: retired.file.id }, data: { status: "RETIRED", cleanupRequestedAt: new Date(), nextSweepAt: new Date() } });
      await tx.mediaAsset.update({ where: { id: retired.id }, data: { storageStatus: "DELETING" } });
      await tx.mediaDeletionJob.update({ where: { id: job.id }, data: { status: "RUNNING", leaseToken: "library-delete-fixture", leaseExpiresAt: new Date(Date.now() + 60000), attemptCount: 1 } });
    });
    await denied("media-admin", retired.file.urlKey);
  });

  await check("media resolver: registered physical key cannot bypass logical-key ownership", async () => {
    const mapped = await asset("PERSONAL", "owner", "media/personal/owner/protected/original.png");
    await denied("media-admin", mapped.file.urlKey);
    // The legacy path alone would have admitted an admin. Its registered state wins.
    await denied("media-admin", mapped.file.objectKey);
    await resolve("owner", mapped.file.objectKey);
  });

  await check("media resolver: verified legacy prefix preserves old URLs and their access rules", async () => {
    const prefixed = (key: string, actor: () => Promise<string>) => resolveMediaLocation(db, new URL(`https://app.example.invalid${libraryMediaUrl(key)}`), actor, "library-test", "old-bucket/");
    const anonymous = async () => { throw new ApiError("Login required", 401, "UNAUTHORIZED"); };
    for (const key of ["avatars/u/image.png", "community/u/videos/video.mp4", "products/p/images/cover.png"]) {
      assert.deepEqual(await prefixed(key, anonymous), { objectKey: "old-bucket/" + key, isPublic: true });
    }
    const key = `courses/${courseId}/lessons/${lesson.id}/images/existing.png`;
    assert.deepEqual(await prefixed(key, async () => "teacher"), { objectKey: "old-bucket/" + key, isPublic: false });
    await assert.rejects(prefixed(key, anonymous), errorCode("UNAUTHORIZED"));
    await assert.rejects(prefixed(key, async () => "owner"), errorCode("FORBIDDEN"));
  });

  await check("media resolver: prefixed legacy alias cannot bypass a registered private object", async () => {
    const logical = "community/u/images/registered-private.png";
    const physical = "old-bucket/" + logical;
    const mapped = await asset("PERSONAL", "owner", "media/personal/owner/mapped/original.png", physical);
    const prefixed = (key: string, actorId: string) => resolveMediaLocation(db, new URL(`https://app.example.invalid${libraryMediaUrl(key)}`), async () => actorId, "library-test", "old-bucket/");
    for (const key of [logical, physical, mapped.file.urlKey]) {
      await assert.rejects(prefixed(key, "teacher"), errorCode("MEDIA_NOT_FOUND"));
      const allowed = await prefixed(key, "owner");
      assert.equal(allowed.objectKey, physical);
      assert.equal(allowed.isPublic, false);
    }
  });

  await check("media resolver: conflicting registered URL and prefixed physical mapping fail closed", async () => {
    const logical = "community/u/images/ambiguous.png";
    await asset("PERSONAL", "teacher", logical);
    await asset("PERSONAL", "teacher", "media/personal/teacher/other/original.png", "old-bucket/" + logical);
    await assert.rejects(resolveMediaLocation(db, new URL(`https://app.example.invalid${libraryMediaUrl(logical)}`), async () => "teacher", "library-test", "old-bucket/"), errorCode("MEDIA_NOT_FOUND"));
  });

  await check("media playback: suspended user denied even with ownership and valid usage", async () => {
    await db.user.update({ where: { id: "teacher" }, data: { status: "SUSPENDED" } });
    try {
      await denied("teacher", own.file.urlKey);
      await denied("teacher", other.file.urlKey);
      await assert.rejects(listMediaLibrary(db, "teacher"), errorCode("FORBIDDEN"));
    } finally { await db.user.update({ where: { id: "teacher" }, data: { status: "ACTIVE" } }); }
  });

  await check("media GET: authorization precedes storage; Range 200/206/416 retain private no-store", async () => {
    const bytes = Buffer.from("0123456789");
    const touched: string[] = [];
    const handler = createMediaGetHandler({
      resolve: url => resolveMediaLocation(db, url, async () => "student", "library-test"),
      head: async key => { touched.push(key); return { contentLength: bytes.length, contentType: "text/plain" }; },
      get: async key => {
        touched.push(key);
        // Storage ignores Range: the handler must slice the full body correctly.
        return { ContentLength: bytes.length, ContentType: "text/plain", Body: {
          transformToByteArray: async () => new Uint8Array(bytes),
          transformToWebStream: () => new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(bytes)); controller.close(); } }),
        } } as Awaited<ReturnType<typeof getR2Object>>;
      },
    });
    const request = (key: string, range?: string) => new Request(`https://app.example.invalid${libraryMediaUrl(key)}`, { headers: range ? { range } : {} });
    assert.equal((await handler(request(own.file.urlKey))).status, 404);
    assert.equal(touched.length, 0);
    for (const [range, status, value] of [[undefined, 200, "0123456789"], ["bytes=2-4", 206, "234"], ["bytes=-2", 206, "89"], ["bytes=20-30", 416, ""]] as const) {
      const response = await handler(request(other.file.urlKey, range));
      assert.equal(response.status, status);
      assert.equal(await response.text(), value);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal(response.headers.get("vary"), "Cookie");
      assert.equal(response.headers.get("content-type"), "image/png");
    }
    assert(touched.every(key => key === other.file.objectKey));
  });

  await db.enrollment.delete({ where: { id: enrolled.id } });
}
