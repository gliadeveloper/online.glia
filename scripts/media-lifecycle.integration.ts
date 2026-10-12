import assert from "node:assert/strict";
import type { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { setMediaLibraryStatus } from "../src/lib/media/library-lifecycle";
import { listMediaLibrary, authorizeRegisteredMedia, libraryMediaUrl } from "../src/lib/media/library";
import { createContent, deleteContent } from "../src/lib/curriculum-admin";

type Check = (name: string, work: () => Promise<unknown>) => Promise<void>;
const errorCode = (code: string) => (error: unknown) => (error as { code?: string }).code === code;
const version = (row: { updatedAt: Date }) => row.updatedAt.toISOString();
function gate() { let open!: () => void; const wait = new Promise<void>(resolve => { open = resolve; }); return { wait, open }; }

export async function runMediaLifecycleIntegration(db: PrismaClient, check: Check) {
  async function asset(scope = "PERSONAL", ownerUserId: string | undefined = "teacher", ready = true) {
    return db.$transaction(async tx => {
      const a = await tx.mediaAsset.create({ data: { scope, ownerUserId: scope === "PERSONAL" ? ownerUserId : undefined, kind: "IMAGE", originalName: "lifecycle.png", layout: "LEGACY" } });
      const file = await tx.mediaFile.create({ data: { assetId: a.id, role: "ORIGINAL", bucket: "lifecycle-test", objectKey: `legacy/${a.id}.png`, urlKey: `legacy/${a.id}.png` } });
      if (ready) await tx.mediaFile.update({ where: { id: file.id }, data: { status: "READY", mimeType: "image/png", byteSize: BigInt(10), sha256: "a".repeat(64), metadataCheckedAt: new Date(), verifiedAt: new Date() } });
      return ready ? tx.mediaAsset.update({ where: { id: a.id }, data: { storageStatus: "READY" } }) : a;
    });
  }
  const move = (a: { id: string; updatedAt: Date }, libraryStatus = "TRASHED", actorId = "teacher") => setMediaLibraryStatus(db, { actorId, assetId: a.id, libraryStatus, expectedVersion: version(a) });
  const fresh = (id: string) => db.mediaAsset.findUniqueOrThrow({ where: { id } });
  const job = (assetId: string) => db.mediaDeletionJob.findUnique({ where: { assetId } });
  async function readyToDelete() {
    const a = await asset(); await move(a);
    await db.mediaAsset.update({ where: { id: a.id }, data: { trashedAt: new Date(Date.now() - 40 * 86400000), trashExpiresAt: new Date(Date.now() - 86400000) } });
    await db.mediaDeletionJob.update({ where: { assetId: a.id }, data: { nextAttemptAt: new Date(0) } });
    return fresh(a.id);
  }
  // Future worker simulation: obey the existing asset→files→job lock contract.
  async function claim(tx: Prisma.TransactionClient, id: string) {
    await tx.mediaAsset.update({ where: { id }, data: { storageStatus: "DELETING" } });
    await tx.mediaFile.updateMany({ where: { assetId: id }, data: { status: "RETIRED", isCurrent: false, cleanupRequestedAt: new Date(), nextSweepAt: new Date() } });
    await tx.mediaDeletionJob.update({ where: { assetId: id }, data: { status: "RUNNING", leaseToken: "fixture-delete", leaseExpiresAt: new Date(Date.now() + 60000) } });
  }

  await check("library trash: unused asset schedules after 30 days and retains the original", async () => {
    const a = await asset(); const files = await db.mediaFile.findMany({ where: { assetId: a.id } });
    const moved = await move(a); const row = await fresh(a.id); const deletion = await job(a.id);
    assert.equal(moved.libraryStatus, "TRASHED"); assert.equal(row.storageStatus, "READY");
    assert.equal(row.trashExpiresAt!.getTime() - row.trashedAt!.getTime(), 30 * 86400000);
    assert.equal(deletion?.status, "SCHEDULED"); assert.equal(deletion.nextAttemptAt.getTime(), row.trashExpiresAt!.getTime());
    assert.deepEqual(await db.mediaFile.findMany({ where: { assetId: a.id } }), files);
    assert.equal(await db.auditLog.count({ where: { entityId: a.id, action: "MEDIA_ASSET_TRASHED" } }), 1);
  });
  await check("library restore: cancels scheduled job, clears both times and can be trashed again", async () => {
    const a = await asset(); await move(a); await move(await fresh(a.id), "ACTIVE");
    const restored = await fresh(a.id);
    assert.equal(restored.libraryStatus, "ACTIVE"); assert.equal(restored.trashedAt, null); assert.equal(restored.trashExpiresAt, null);
    assert.equal((await job(a.id))?.status, "CANCELLED");
    await move(restored); assert.equal((await job(a.id))?.status, "SCHEDULED");
  });
  await check("library trash: existing content and playback remain; new insertion denied; last removal schedules", async () => {
    const a = await asset(); const file = await db.mediaFile.findFirstOrThrow({ where: { assetId: a.id } });
    const parent = await db.module.create({ data: { courseId: "00000000-0000-4000-8000-000000000001", title: "Trash contract" } });
    const lesson = await db.lesson.create({ data: { moduleId: parent.id, title: "Trash contract" } });
    const body = `![image](${libraryMediaUrl(file.urlKey)})`;
    const c = await createContent({ actorId: "teacher", lessonId: lesson.id, type: "HTML", body }, db);
    await move(a);
    assert.equal((await db.content.findUniqueOrThrow({ where: { id: c.id } })).body, body);
    assert.equal(await db.mediaUsage.count({ where: { assetId: a.id } }), 1); assert.equal(await job(a.id), null);
    await authorizeRegisteredMedia(db, "teacher", { ...file, asset: await fresh(a.id) }, { contentId: c.id });
    await assert.rejects(createContent({ actorId: "teacher", lessonId: lesson.id, type: "HTML", body }, db), errorCode("MEDIA_SELECTION_FORBIDDEN"));
    await deleteContent({ actorId: "teacher", contentId: c.id }, db);
    assert.equal((await job(a.id))?.status, "SCHEDULED");
  });
  await check("library management: personal ownership, shared admin and unclassified boundaries", async () => {
    const other = await asset("PERSONAL", "owner");
    for (const actor of ["teacher", "media-admin"]) await assert.rejects(move(other, "TRASHED", actor), errorCode("MEDIA_NOT_FOUND"));
    const shared = await asset("SHARED");
    await assert.rejects(move(shared), errorCode("MEDIA_MANAGEMENT_FORBIDDEN"));
    await move(shared, "TRASHED", "media-admin"); await move(await fresh(shared.id), "ACTIVE", "media-admin");
    const unknown = await asset("UNCLASSIFIED");
    await assert.rejects(move(unknown, "TRASHED", "media-admin"), errorCode("MEDIA_NOT_FOUND"));
    await assert.rejects(move(await asset(), "TRASHED", "student"), errorCode("FORBIDDEN"));
  });
  await check("library management: suspended owner cannot change state", async () => {
    const a = await asset("PERSONAL", "owner");
    await db.user.update({ where: { id: "owner" }, data: { status: "SUSPENDED" } });
    try { await assert.rejects(move(a, "TRASHED", "owner"), errorCode("FORBIDDEN")); }
    finally { await db.user.update({ where: { id: "owner" }, data: { status: "ACTIVE" } }); }
    assert.equal((await fresh(a.id)).libraryStatus, "ACTIVE");
  });
  await check("library trash: hold prevents scheduling and survives restore", async () => {
    const a = await asset(); const held = await db.mediaAsset.update({ where: { id: a.id }, data: { retentionHold: "REVIEW" } });
    await move(held); assert.equal(await job(a.id), null);
    await move(await fresh(a.id), "ACTIVE"); assert.equal((await fresh(a.id)).retentionHold, "REVIEW");
  });
  await check("library trash list: owners/admin only, no active or deleting rows", async () => {
    const a = await asset(); const other = await asset("PERSONAL", "owner"); const shared = await asset("SHARED"); const active = await asset();
    await move(a); await move(other, "TRASHED", "owner"); await move(shared, "TRASHED", "media-admin");
    const rows = (await listMediaLibrary(db, "teacher", { status: "TRASHED", limit: 100 })).items;
    const current = await fresh(a.id);
    assert(rows.some(row => row.id === a.id && row.canManage && row.version === version(current)));
    assert(!rows.some(row => [other.id, shared.id, active.id].includes(row.id)));
    const common = await listMediaLibrary(db, "media-admin", { scope: "SHARED", status: "TRASHED", limit: 100 });
    assert(common.items.some(row => row.id === shared.id && row.canManage));
    await assert.rejects(listMediaLibrary(db, "teacher", { scope: "SHARED", status: "TRASHED" }), errorCode("MEDIA_MANAGEMENT_FORBIDDEN"));
    await assert.rejects(listMediaLibrary(db, "teacher", { status: "DELETED" }), errorCode("VALIDATION_ERROR"));
    assert((await listMediaLibrary(db, "teacher", { scope: "SHARED" })).items.every(row => !row.canManage));
  });
  await check("library versions: duplicate action does not extend grace and delayed requests cannot undo restore", async () => {
    const a = await asset(); await move(a); const trashed = await fresh(a.id);
    await move(trashed); assert.deepEqual(await fresh(a.id), trashed);
    assert.equal(await db.auditLog.count({ where: { entityId: a.id } }), 1);
    await move(trashed, "ACTIVE");
    await assert.rejects(move(a), errorCode("MEDIA_LIBRARY_CONFLICT"));
    await assert.rejects(setMediaLibraryStatus(db, { actorId: "teacher", assetId: a.id, libraryStatus: "TRASHED", expectedVersion: undefined }), errorCode("MEDIA_VERSION_REQUIRED"));
    assert.equal((await fresh(a.id)).libraryStatus, "ACTIVE");
  });
  await check("library concurrency: two old-screen changes have one winner and one audit", async () => {
    const a = await asset(); const results = await Promise.allSettled([move(a), move(a)]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    const rejected = results.find(r => r.status === "rejected"); assert(rejected?.status === "rejected" && errorCode("MEDIA_LIBRARY_CONFLICT")(rejected.reason));
    assert.equal(await db.auditLog.count({ where: { entityId: a.id } }), 1);
  });
  await check("library audit failure: trash and restore each roll back state and deletion job", async () => {
    const a = await asset();
    await db.$executeRawUnsafe(`CREATE FUNCTION media_test_reject_library() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action IN ('MEDIA_ASSET_TRASHED','MEDIA_ASSET_RESTORED') THEN RAISE EXCEPTION 'injected library audit failure'; END IF; RETURN NEW; END $$`);
    const install = () => db.$executeRawUnsafe(`CREATE TRIGGER media_test_reject_library BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION media_test_reject_library()`);
    const remove = () => db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS media_test_reject_library ON audit_logs`);
    try {
      await install(); await assert.rejects(move(a), /injected library audit failure/);
      assert.deepEqual(await fresh(a.id), a); assert.equal(await job(a.id), null);
      await remove(); await move(a); const trashed = await fresh(a.id);
      await install(); await assert.rejects(move(trashed, "ACTIVE"), /injected library audit failure/);
      assert.deepEqual(await fresh(a.id), trashed); assert.equal((await job(a.id))?.status, "SCHEDULED");
    } finally { await remove(); await db.$executeRawUnsafe(`DROP FUNCTION media_test_reject_library()`); }
  });
  await check("library concurrency: new usage and trash serialize without scheduling a used asset", async () => {
    const a = await asset(); const file = await db.mediaFile.findFirstOrThrow({ where: { assetId: a.id } });
    const parent = await db.module.create({ data: { courseId: "00000000-0000-4000-8000-000000000001", title: "Usage race" } });
    const lesson = await db.lesson.create({ data: { moduleId: parent.id, title: "Usage race" } });
    const results = await Promise.allSettled([
      createContent({ actorId: "teacher", lessonId: lesson.id, type: "HTML", body: `![x](${libraryMediaUrl(file.urlKey)})` }, db),
      move(a),
    ]);
    assert.equal(results[1].status, "fulfilled");
    if (results[0].status === "fulfilled") {
      assert.equal(await db.mediaUsage.count({ where: { assetId: a.id } }), 1); assert.equal(await job(a.id), null);
    } else {
      assert(errorCode("MEDIA_SELECTION_FORBIDDEN")(results[0].reason));
      assert.equal(await db.mediaUsage.count({ where: { assetId: a.id } }), 0); assert.equal((await job(a.id))?.status, "SCHEDULED");
    }
  });
  await check("library deletion race: committed restore prevents a later deletion claim", async () => {
    const a = await readyToDelete(); await move(a, "ACTIVE");
    await assert.rejects(db.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM media_assets WHERE id = ${a.id} FOR UPDATE`; await claim(tx, a.id); }), /not eligible for deletion|check constraint/);
    assert.equal((await fresh(a.id)).storageStatus, "READY"); assert.equal((await job(a.id))?.status, "CANCELLED");
  });
  await check("library deletion race: waiting restore rechecks the committed deletion state", async () => {
    const a = await readyToDelete(); const locked = gate(); const release = gate();
    const deleting = db.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM media_assets WHERE id = ${a.id} FOR UPDATE`; locked.open(); await release.wait; await claim(tx, a.id); });
    await locked.wait;
    const restoring = move(a, "ACTIVE"); release.open();
    const results = await Promise.allSettled([deleting, restoring]);
    assert.equal(results[0].status, "fulfilled");
    assert(results[1].status === "rejected" && errorCode("MEDIA_NOT_RESTORABLE")(results[1].reason));
    assert.equal((await fresh(a.id)).storageStatus, "DELETING");
    assert(!(await listMediaLibrary(db, "teacher", { status: "TRASHED", limit: 100 })).items.some(row => row.id === a.id));
    await db.$transaction(async tx => {
      await tx.mediaFile.updateMany({ where: { assetId: a.id }, data: { status: "DELETED", lastAbsenceObservedAt: new Date() } });
      await tx.mediaAsset.update({ where: { id: a.id }, data: { storageStatus: "DELETED" } });
      await tx.mediaDeletionJob.update({ where: { assetId: a.id }, data: { status: "SUCCEEDED", leaseToken: null, leaseExpiresAt: null, completedAt: new Date() } });
    });
    await assert.rejects(move(await fresh(a.id), "ACTIVE"), errorCode("MEDIA_NOT_RESTORABLE"));
    await assert.rejects(move(await asset("PERSONAL", "teacher", false)), errorCode("MEDIA_NOT_RESTORABLE"));
  });
}
