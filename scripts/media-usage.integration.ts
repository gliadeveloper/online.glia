import assert from "node:assert/strict";
import type { PrismaClient } from "../src/generated/prisma/client";
import { createContent, updateContent, deleteContent, deleteLesson, deleteModule } from "../src/lib/curriculum-admin";
import { coachUpdateSession } from "../src/lib/coaching-coach";
import { adminUpdateCoachingSession } from "../src/lib/coaching-admin";
import { extractMediaReferences, mediaUrlKey } from "../src/lib/media/body-references";
import { mediaBodyVersion } from "../src/lib/media/body-version";

type Check = (name: string, work: () => Promise<unknown>) => Promise<void>;
const courseId = "00000000-0000-4000-8000-000000000001";
const url = (key: string) => `/api/media/r2?key=${encodeURIComponent(key)}`;
const image = (key: string) => `![media](${url(key)})`;
const blocks = (...keys: string[]) => ({ blocknote: { blocks: keys.map(key => ({ type: "image", props: { url: url(key) }, children: [] })) } });
const errorCode = (code: string) => (error: unknown) => (error as { code?: string }).code === code;

/** Called only after the harness installs its isolated database URL. No R2 I/O. */
export async function runMediaUsageIntegration(db: PrismaClient, check: Check) {
  await db.user.create({ data: { id: "media-admin", email: "media-admin@example.invalid", role: "ADMIN" } });
  async function lesson() {
    const parent = await db.module.create({ data: { courseId, title: "Media test module" } });
    return db.lesson.create({ data: { moduleId: parent.id, title: "Media test lesson" } });
  }
  async function asset(scope = "SHARED", ownerUserId?: string, objectKey?: string) {
    return db.$transaction(async tx => {
      const a = await tx.mediaAsset.create({ data: { scope, ownerUserId, kind: "IMAGE", originalName: "fixture.png", layout: "LEGACY" } });
      const key = objectKey ?? `courses/${courseId}/lessons/fixture/images/${a.id}.png`;
      const file = await tx.mediaFile.create({ data: { assetId: a.id, role: "ORIGINAL", bucket: "fixture", objectKey: key, urlKey: key } });
      await tx.mediaFile.update({ where: { id: file.id }, data: { status: "READY", mimeType: "image/png", byteSize: BigInt(100), sha256: "a".repeat(64), metadataCheckedAt: new Date(), verifiedAt: new Date() } });
      await tx.mediaAsset.update({ where: { id: a.id }, data: { storageStatus: "READY" } });
      return { id: a.id, key };
    });
  }
  async function content(key?: string) {
    const l = await lesson();
    return createContent({ actorId: "teacher", lessonId: l.id, type: "HTML", body: key ? image(key) : "Initial body" }, db);
  }
  async function trash(id: string, hold?: string) {
    await db.mediaAsset.update({ where: { id }, data: { libraryStatus: "TRASHED", trashedAt: new Date(), trashExpiresAt: new Date(Date.now() + 86400000), retentionHold: hold } });
  }
  async function session() {
    const entitlement = await db.coachingEntitlement.create({ data: { userId: "student", coachId: "teacher", coachingOfferingId: "offering", totalSessions: 1, validUntil: new Date(Date.now() + 86400000) } });
    return db.coachingSession.create({ data: { entitlementId: entitlement.id, coachId: "teacher", userId: "student", sessionNo: 1, title: "Fixture", scheduledAt: new Date(), bodyMarkdown: "Initial feedback" } });
  }
  const sessionVersion = (s: { bodyMarkdown: string | null; bodyMetadata: unknown }) => mediaBodyVersion({ body: s.bodyMarkdown, metadata: s.bodyMetadata });
  const config = { appOrigin: "https://app.example.invalid", publicBaseUrl: "https://media.example.invalid/files" };
  const canonical = (...keys: string[]) => ({ blocknote: { ...blocks(...keys).blocknote, version: 2 } });

  await check("canonical content: JSON defines saved Markdown and usages on create and update", async () => {
    const a = await asset(); const b = await asset(); const l = await lesson();
    const c = await createContent({ actorId: "teacher", lessonId: l.id, type: "HTML", body: image(b.key), metadata: canonical(a.key) }, db);
    assert(c.body?.includes(encodeURIComponent(a.key)));
    assert(!c.body?.includes(encodeURIComponent(b.key)));
    assert.deepEqual((await db.mediaUsage.findMany({ where: { contentId: c.id } })).map(u => [u.assetId, u.occurrenceCount]), [[a.id, 1]]);
    const next = await updateContent({ actorId: "teacher", contentId: c.id, metadata: canonical(b.key), expectedBodyVersion: await mediaBodyVersion(c) }, db);
    assert(next.body?.includes(encodeURIComponent(b.key)));
    assert.deepEqual((await db.mediaUsage.findMany({ where: { contentId: c.id } })).map(u => u.assetId), [b.id]);
  });
  await check("canonical content: incomplete patch or invalid blocks roll back body, usages and audit", async () => {
    const a = await asset(); const l = await lesson();
    const c = await createContent({ actorId: "teacher", lessonId: l.id, type: "HTML", metadata: canonical(a.key) }, db);
    const before = await db.auditLog.count({ where: { entityId: c.id } });
    await assert.rejects(updateContent({ actorId: "teacher", contentId: c.id, body: "alone", expectedBodyVersion: await mediaBodyVersion(c) }, db), errorCode("BLOCKNOTE_BLOCKS_REQUIRED"));
    await assert.rejects(updateContent({ actorId: "teacher", contentId: c.id, metadata: { blocknote: { version: 2, blocks: [{ type: "unknown" }] } }, expectedBodyVersion: await mediaBodyVersion(c) }, db), errorCode("INVALID_BLOCKNOTE_BODY"));
    assert.deepEqual(await db.content.findUniqueOrThrow({ where: { id: c.id } }), c);
    assert.equal(await db.mediaUsage.count({ where: { contentId: c.id, assetId: a.id } }), 1);
    assert.equal(await db.auditLog.count({ where: { entityId: c.id } }), before);
  });
  await check("canonical coaching: coach and admin share the same server conversion and one original", async () => {
    const a = await asset(); const s = await session(); const l = await lesson();
    await createContent({ actorId: "teacher", lessonId: l.id, type: "HTML", metadata: canonical(a.key) }, db);
    const saved = await coachUpdateSession({ coachId: "teacher", sessionId: s.id, bodyMarkdown: "untrusted", bodyMetadata: canonical(a.key), publicationStatus: "PUBLISHED", expectedBodyVersion: await sessionVersion(s) }, db);
    assert(saved.bodyMarkdown?.includes(encodeURIComponent(a.key)));
    const next = await adminUpdateCoachingSession({ actorId: "media-admin", sessionId: s.id, bodyMarkdown: "untrusted again", bodyMetadata: canonical(a.key), expectedBodyVersion: await sessionVersion(saved) }, db);
    assert.equal(saved.bodyMarkdown, next.bodyMarkdown);
    assert.equal(await db.mediaUsage.count({ where: { assetId: a.id } }), 2);
    assert.equal(await db.mediaFile.count({ where: { assetId: a.id } }), 1);
  });
  await check("canonical coaching: a private asset in JSON is denied even when Markdown hides it", async () => {
    const a = await asset("PERSONAL", "owner"); const s = await session();
    await assert.rejects(coachUpdateSession({ coachId: "teacher", sessionId: s.id, bodyMarkdown: "innocent", bodyMetadata: canonical(a.key), expectedBodyVersion: await sessionVersion(s) }, db), errorCode("MEDIA_SELECTION_FORBIDDEN"));
    assert.equal((await db.coachingSession.findUniqueOrThrow({ where: { id: s.id } })).bodyMarkdown, s.bodyMarkdown);
    assert.equal(await db.mediaUsage.count({ where: { coachingSessionId: s.id } }), 0);
    assert.equal(await db.auditLog.count({ where: { entityId: s.id } }), 0);
  });

  await check("parser: exact origins, encoded key, duplicate query and host spoofing", async () => {
    assert.equal(mediaUrlKey(url("courses/a/lessons/b/한 글.png"), config), "courses/a/lessons/b/한 글.png");
    assert.equal(mediaUrlKey("https://media.example.invalid/files/a%20b.png", config), "a b.png");
    assert.equal(mediaUrlKey("https://app.example.invalid.attacker.invalid/api/media/r2?key=a", config), null);
    assert.equal(mediaUrlKey("https://media.example.invalid/files2/a.png", config), null);
    assert.throws(() => mediaUrlKey("/api/media/r2?key=a&key=b", config), errorCode("INVALID_MEDIA_REFERENCE"));
    assert.throws(() => mediaUrlKey(url("courses/../a"), config), errorCode("INVALID_MEDIA_REFERENCE"));
  });
  await check("parser: Markdown references and HTML media, excluding code samples", async () => {
    const key = "coaching/x/images/a.png";
    const refs = extractMediaReferences({ body: `![x][id]\n\n[id]: ${url(key)}\n\n<video src="${url(key)}" poster="${url(key)}"></video>\n\n\`${image(key)}\`\n\n\`\`\`\n${image(key)}\n\`\`\`` }, config);
    assert.equal(refs[1].length, 3);
    assert(refs[1].every(ref => ref.key === key));
  });
  await check("parser: nested blocks, links, table cells and malformed metadata", async () => {
    const key = "coaching/x/audio/a.mp3";
    const metadata = { blocknote: { blocks: [{ type: "paragraph", children: [{ type: "audio", props: { url: url(key) } }], content: [{ type: "link", href: url(key) }] }, { type: "table", content: { rows: [{ cells: [[{ type: "link", href: url(key) }]] }] } }] } };
    assert.equal(extractMediaReferences({ metadata }, config)[0].length, 3);
    assert.throws(() => extractMediaReferences({ metadata: { blocknote: {} } }, config), errorCode("INVALID_MEDIA_REFERENCE"));
  });
  await check("parser: GFM bare URLs, first duplicate definition and HTML depth bound", async () => {
    const first = "coaching/a/images/first.png";
    const second = "coaching/a/images/second.png";
    const refs = extractMediaReferences({ body: `![image][ref]\n\n[ref]: ${url(first)}\n[ref]: ${url(second)}\n\nhttps://app.example.invalid${url(first)}` }, config)[1];
    assert.deepEqual(refs.map(ref => ref.key), [first, first]);
    assert.throws(() => extractMediaReferences({ body: "<div>".repeat(66) + "</div>".repeat(66) }, config), errorCode("INVALID_MEDIA_REFERENCE"));
  });
  await check("body version: JSON order stable, body/url/metadata changes detected", async () => {
    const baseline = await mediaBodyVersion({ body: "x", metadata: { b: 1, a: 2 } });
    assert.equal(baseline, await mediaBodyVersion({ body: "x", url: null, metadata: { a: 2, b: 1 } }));
    for (const next of [{ body: "y", metadata: { b: 1, a: 2 } }, { body: "x", url: "z", metadata: { b: 1, a: 2 } }, { body: "x", metadata: {} }]) assert.notEqual(baseline, await mediaBodyVersion(next));
  });
  await check("content create: same asset in JSON and Markdown counted once per occurrence", async () => {
    const a = await asset(); const l = await lesson();
    const c = await createContent({ actorId: "teacher", lessonId: l.id, type: "HTML", body: `${image(a.key)}\n${image(a.key)}`, metadata: blocks(a.key, a.key) }, db);
    assert.deepEqual((await db.mediaUsage.findMany({ where: { contentId: c.id } })).map(u => [u.assetId, u.occurrenceCount]), [[a.id, 2]]);
    assert.equal(await db.auditLog.count({ where: { entityId: c.id } }), 2);
  });
  await check("content create: own personal allowed, another owner's personal denied with full rollback", async () => {
    const own = await asset("PERSONAL", "teacher"); await content(own.key);
    const other = await asset("PERSONAL", "owner"); const l = await lesson();
    const audits = await db.auditLog.count();
    await assert.rejects(createContent({ actorId: "teacher", lessonId: l.id, type: "HTML", body: image(other.key) }, db), errorCode("MEDIA_SELECTION_FORBIDDEN"));
    assert.equal(await db.content.count({ where: { lessonId: l.id } }), 0);
    assert.equal(await db.mediaUsage.count({ where: { assetId: other.id } }), 0);
    assert.equal(await db.auditLog.count(), audits);
  });
  await check("content update: failed media selection rolls back body and audit", async () => {
    const a = await asset("PERSONAL", "owner"); const c = await content();
    const audits = await db.auditLog.count({ where: { entityId: c.id } });
    await assert.rejects(updateContent({ actorId: "teacher", contentId: c.id, body: image(a.key), expectedBodyVersion: await mediaBodyVersion(c) }, db), errorCode("MEDIA_SELECTION_FORBIDDEN"));
    assert.equal((await db.content.findUniqueOrThrow({ where: { id: c.id } })).body, c.body);
    assert.equal(await db.auditLog.count({ where: { entityId: c.id } }), audits);
  });
  await check("content authorization: unrelated coach cannot update or delete", async () => {
    const c = await content();
    await assert.rejects(updateContent({ actorId: "owner", contentId: c.id, title: "Forbidden" }, db), errorCode("FORBIDDEN"));
    await assert.rejects(deleteContent({ actorId: "owner", contentId: c.id }, db), errorCode("FORBIDDEN"));
    assert(await db.content.findUnique({ where: { id: c.id } }));
  });
  await check("content update: omitted metadata retained, explicit null removes usage", async () => {
    const a = await asset(); const l = await lesson();
    const c = await createContent({ actorId: "teacher", lessonId: l.id, type: "HTML", body: "Text", metadata: blocks(a.key) }, db);
    const next = await updateContent({ actorId: "teacher", contentId: c.id, body: "Updated", expectedBodyVersion: await mediaBodyVersion(c) }, db);
    assert.deepEqual(next.metadata, c.metadata);
    assert.equal(await db.mediaUsage.count({ where: { contentId: c.id } }), 1);
    await updateContent({ actorId: "teacher", contentId: c.id, metadata: null, expectedBodyVersion: await mediaBodyVersion(next) }, db);
    assert.equal(await db.mediaUsage.count({ where: { contentId: c.id } }), 0);
    assert.equal(await db.mediaDeletionJob.count({ where: { assetId: a.id } }), 0);
  });
  await check("content update: stale/missing versions fail, simultaneous saves have one winner", async () => {
    const a = await asset(); const b = await asset(); const c = await content();
    await assert.rejects(updateContent({ actorId: "teacher", contentId: c.id, body: "No version" }, db), errorCode("BODY_VERSION_REQUIRED"));
    const expectedBodyVersion = await mediaBodyVersion(c);
    const results = await Promise.allSettled([a, b].map(x => updateContent({ actorId: "teacher", contentId: c.id, body: image(x.key), expectedBodyVersion }, db)));
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    const rejected = results.find(r => r.status === "rejected");
    assert(rejected?.status === "rejected" && errorCode("BODY_CONFLICT")(rejected.reason));
    const saved = await db.content.findUniqueOrThrow({ where: { id: c.id } });
    const usages = await db.mediaUsage.findMany({ where: { contentId: c.id } });
    assert.deepEqual(usages.map(u => u.assetId), [saved.body === image(a.key) ? a.id : b.id]);
    assert.equal(await db.auditLog.count({ where: { entityId: c.id, action: "CONTENT_UPDATED" } }), 1);
  });
  await check("trash: existing usages remain editable, new copies forbidden, last removal schedules", async () => {
    const a = await asset(); const c = await content(a.key); await trash(a.id);
    const kept = await updateContent({ actorId: "teacher", contentId: c.id, body: image(a.key) + "\nUpdated", expectedBodyVersion: await mediaBodyVersion(c) }, db);
    await assert.rejects(content(a.key), errorCode("MEDIA_SELECTION_FORBIDDEN"));
    await updateContent({ actorId: "teacher", contentId: c.id, body: "Removed", expectedBodyVersion: await mediaBodyVersion(kept) }, db);
    const job = await db.mediaDeletionJob.findUniqueOrThrow({ where: { assetId: a.id } });
    const current = await db.mediaAsset.findUniqueOrThrow({ where: { id: a.id } });
    assert.equal(job.status, "SCHEDULED");
    assert(job.nextAttemptAt >= current.trashExpiresAt!);
    assert.equal(current.storageStatus, "READY");
  });
  await check("retention hold: removing the last use does not schedule deletion", async () => {
    const a = await asset(); const c = await content(a.key); await trash(a.id, "manual review");
    await deleteContent({ actorId: "teacher", contentId: c.id }, db);
    assert.equal(await db.mediaDeletionJob.count({ where: { assetId: a.id } }), 0);
  });
  await check("legacy unknown owner: saved-body adoption allowed, new selection forbidden", async () => {
    const a = await asset("UNCLASSIFIED"); const l = await lesson();
    const c = await db.content.create({ data: { lessonId: l.id, type: "HTML", body: image(a.key) } });
    await updateContent({ actorId: "teacher", contentId: c.id, title: "Adopt old usage" }, db);
    assert.equal(await db.mediaUsage.count({ where: { assetId: a.id, contentId: c.id } }), 1);
    await assert.rejects(content(a.key), errorCode("MEDIA_SELECTION_FORBIDDEN"));
    await deleteContent({ actorId: "teacher", contentId: c.id }, db);
    assert.equal(await db.mediaDeletionJob.count({ where: { assetId: a.id } }), 0);
  });
  await check("legacy adoption cancels a scheduled deletion in the same transaction", async () => {
    const a = await asset(); const l = await lesson();
    const c = await db.content.create({ data: { lessonId: l.id, type: "HTML", body: image(a.key) } });
    await trash(a.id);
    await db.mediaDeletionJob.create({ data: { assetId: a.id, nextAttemptAt: new Date(Date.now() + 86400000) } });
    await updateContent({ actorId: "teacher", contentId: c.id, title: "Preserve" }, db);
    assert.equal((await db.mediaDeletionJob.findUniqueOrThrow({ where: { assetId: a.id } })).status, "CANCELLED");
  });
  await check("legacy unregistered: local uploads audited, cross-context copy and canonical unknown denied", async () => {
    const l = await lesson(); const key = `courses/${courseId}/lessons/${l.id}/images/old.png`;
    const c = await createContent({ actorId: "teacher", lessonId: l.id, type: "HTML", body: image(key) }, db);
    const audit = await db.auditLog.findFirstOrThrow({ where: { entityId: c.id, action: "MEDIA_USAGES_SYNCED" } });
    assert.equal((audit.metadata as { needsMediaBackfill: boolean }).needsMediaBackfill, true);
    await assert.rejects(content(key), errorCode("MEDIA_NOT_REGISTERED"));
    await assert.rejects(content("media/shared/missing/original.png"), errorCode("MEDIA_NOT_REGISTERED"));
    await assert.rejects(content("media/staging/token/payload"), errorCode("MEDIA_NOT_READY"));
  });
  await check("assetId and URL mismatch rejected without creating content", async () => {
    const a = await asset(); const b = await asset(); const l = await lesson();
    await assert.rejects(createContent({ actorId: "teacher", lessonId: l.id, type: "HTML", metadata: { blocknote: { blocks: [{ type: "image", props: { assetId: a.id, url: url(b.key) } }] } } }, db), errorCode("INVALID_MEDIA_REFERENCE"));
    assert.equal(await db.content.count({ where: { lessonId: l.id } }), 0);
  });
  await check("parent deletion: lesson removes usages together and schedules only final trash use", async () => {
    const a = await asset(); const c = await content(a.key); const outside = await content(a.key); await trash(a.id);
    await deleteLesson({ actorId: "teacher", lessonId: c.lessonId }, db);
    assert.equal(await db.mediaUsage.count({ where: { assetId: a.id } }), 1);
    assert.equal(await db.mediaDeletionJob.count({ where: { assetId: a.id } }), 0);
    await deleteContent({ actorId: "teacher", contentId: outside.id }, db);
    assert.equal((await db.mediaDeletionJob.findUniqueOrThrow({ where: { assetId: a.id } })).status, "SCHEDULED");
  });
  await check("parent deletion: module clears all child usages and writes its audit atomically", async () => {
    const a = await asset(); const c = await content(a.key);
    const first = await db.lesson.findUniqueOrThrow({ where: { id: c.lessonId } });
    const second = await db.lesson.create({ data: { moduleId: first.moduleId, title: "Second" } });
    await createContent({ actorId: "teacher", lessonId: second.id, type: "HTML", body: image(a.key) }, db);
    await trash(a.id);
    await deleteModule({ actorId: "teacher", moduleId: first.moduleId }, db);
    assert.equal(await db.mediaUsage.count({ where: { assetId: a.id } }), 0);
    assert.equal(await db.lesson.count({ where: { moduleId: first.moduleId } }), 0);
    assert.equal(await db.auditLog.count({ where: { entityId: first.moduleId, action: "MODULE_DELETED" } }), 1);
    assert.equal((await db.mediaDeletionJob.findUniqueOrThrow({ where: { assetId: a.id } })).status, "SCHEDULED");
  });
  await check("coaching publish: body/usages/publication event commit together", async () => {
    const a = await asset(); const s = await session();
    const saved = await coachUpdateSession({ coachId: "teacher", sessionId: s.id, bodyMarkdown: image(a.key), publicationStatus: "PUBLISHED", expectedBodyVersion: await sessionVersion(s) }, db);
    assert.equal(saved.publicationStatus, "PUBLISHED");
    assert.equal(await db.mediaUsage.count({ where: { coachingSessionId: s.id, assetId: a.id } }), 1);
    assert.equal(await db.auditLog.count({ where: { entityId: s.id, action: "SESSION_PUBLISHED" } }), 1);
    const event = await db.notificationEvent.findUniqueOrThrow({ where: { coachingSessionId: s.id } });
    assert.equal(await db.notificationDelivery.count({ where: { eventId: event.id, userId: "student" } }), 1);
  });
  await check("coaching: explicit null cannot publish empty content, rejected publication rolls back", async () => {
    const s = await session();
    await assert.rejects(coachUpdateSession({ coachId: "teacher", sessionId: s.id, bodyMarkdown: null, bodyMetadata: null, publicationStatus: "PUBLISHED", expectedBodyVersion: await sessionVersion(s) }, db), errorCode("VALIDATION_ERROR"));
    const actual = await db.coachingSession.findUniqueOrThrow({ where: { id: s.id } });
    assert.equal(actual.bodyMarkdown, s.bodyMarkdown);
    assert.equal(actual.publicationStatus, s.publicationStatus);
    assert.equal(await db.auditLog.count({ where: { entityId: s.id } }), 0);
    assert.equal(await db.notificationEvent.count({ where: { coachingSessionId: s.id } }), 0);
  });
  await check("coaching and course share one asset: first removal retains it, final removal schedules", async () => {
    const a = await asset(); const c = await content(a.key); const s = await session();
    const saved = await coachUpdateSession({ coachId: "teacher", sessionId: s.id, bodyMarkdown: image(a.key), expectedBodyVersion: await sessionVersion(s) }, db);
    await trash(a.id);
    await deleteContent({ actorId: "teacher", contentId: c.id }, db);
    assert.equal(await db.mediaDeletionJob.count({ where: { assetId: a.id } }), 0);
    await coachUpdateSession({ coachId: "teacher", sessionId: s.id, bodyMarkdown: null, bodyMetadata: null, expectedBodyVersion: await sessionVersion(saved) }, db);
    assert.equal((await db.mediaDeletionJob.findUniqueOrThrow({ where: { assetId: a.id } })).status, "SCHEDULED");
  });
  await check("admin editing: existing coach's personal asset retained, new insertion forbidden", async () => {
    const a = await asset("PERSONAL", "teacher"); const s = await session();
    const saved = await coachUpdateSession({ coachId: "teacher", sessionId: s.id, bodyMarkdown: image(a.key), expectedBodyVersion: await sessionVersion(s) }, db);
    const edited = await adminUpdateCoachingSession({ actorId: "media-admin", sessionId: s.id, bodyMarkdown: image(a.key) + "\nEdit", expectedBodyVersion: await sessionVersion(saved) }, db);
    assert(edited.bodyMarkdown?.endsWith("Edit"));
    const other = await session();
    await assert.rejects(adminUpdateCoachingSession({ actorId: "media-admin", sessionId: other.id, bodyMarkdown: image(a.key), expectedBodyVersion: await sessionVersion(other) }, db), errorCode("MEDIA_SELECTION_FORBIDDEN"));
    await assert.rejects(adminUpdateCoachingSession({ actorId: "teacher", sessionId: s.id, title: "Bad role" }, db), errorCode("FORBIDDEN"));
  });
  await check("coaching stale edit: coach and admin cannot overwrite a newer body", async () => {
    const s = await session(); const expectedBodyVersion = await sessionVersion(s);
    await coachUpdateSession({ coachId: "teacher", sessionId: s.id, bodyMarkdown: "Newer", expectedBodyVersion }, db);
    await assert.rejects(adminUpdateCoachingSession({ actorId: "media-admin", sessionId: s.id, bodyMarkdown: "Older", expectedBodyVersion }, db), errorCode("BODY_CONFLICT"));
    await assert.rejects(coachUpdateSession({ coachId: "owner", sessionId: s.id, summary: "Intrusion" }, db), errorCode("FORBIDDEN"));
    assert.equal((await db.coachingSession.findUniqueOrThrow({ where: { id: s.id } })).bodyMarkdown, "Newer");
  });
  await check("audit failure rolls back the content and usage mutation", async () => {
    const a = await asset(); const c = await content();
    await db.$executeRawUnsafe(`CREATE FUNCTION media_test_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'CONTENT_UPDATED' THEN RAISE EXCEPTION 'injected audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER media_test_reject_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION media_test_reject_audit()`);
    try {
      await assert.rejects(updateContent({ actorId: "teacher", contentId: c.id, body: image(a.key), expectedBodyVersion: await mediaBodyVersion(c) }, db), /injected audit failure/);
      assert.equal((await db.content.findUniqueOrThrow({ where: { id: c.id } })).body, c.body);
      assert.equal(await db.mediaUsage.count({ where: { contentId: c.id } }), 0);
      assert.equal(await db.auditLog.count({ where: { entityId: c.id, action: "MEDIA_USAGES_SYNCED" } }), 1);
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER media_test_reject_audit ON audit_logs`);
      await db.$executeRawUnsafe(`DROP FUNCTION media_test_reject_audit()`);
    }
  });
  await check("coaching audit failure rolls back the publication event, body and usage", async () => {
    const a = await asset(); const s = await session();
    await db.$executeRawUnsafe(`CREATE FUNCTION media_test_reject_publish() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'SESSION_PUBLISHED' THEN RAISE EXCEPTION 'injected publication audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER media_test_reject_publish BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION media_test_reject_publish()`);
    try {
      await assert.rejects(coachUpdateSession({ coachId: "teacher", sessionId: s.id, bodyMarkdown: image(a.key), publicationStatus: "PUBLISHED", expectedBodyVersion: await sessionVersion(s) }, db), /injected publication audit failure/);
      assert.equal((await db.coachingSession.findUniqueOrThrow({ where: { id: s.id } })).bodyMarkdown, s.bodyMarkdown);
      assert.equal(await db.mediaUsage.count({ where: { coachingSessionId: s.id } }), 0);
      assert.equal(await db.notificationEvent.count({ where: { coachingSessionId: s.id } }), 0);
      assert.equal(await db.auditLog.count({ where: { entityId: s.id } }), 0);
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER media_test_reject_publish ON audit_logs`);
      await db.$executeRawUnsafe(`DROP FUNCTION media_test_reject_publish()`);
    }
  });
  await check("concurrent creation and parent deletion never leave a detached usage", async () => {
    const a = await asset(); const l = await lesson();
    const results = await Promise.allSettled([
      createContent({ actorId: "teacher", lessonId: l.id, type: "HTML", body: image(a.key) }, db),
      deleteModule({ actorId: "teacher", moduleId: l.moduleId }, db),
    ]);
    assert.equal(results[1].status, "fulfilled");
    if (results[0].status === "rejected") assert(errorCode("LESSON_NOT_FOUND")(results[0].reason));
    assert.equal(await db.content.count({ where: { lessonId: l.id } }), 0);
    assert.equal(await db.mediaUsage.count({ where: { assetId: a.id } }), 0);
  });
}
