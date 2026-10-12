import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import type { PrismaClient } from "../src/generated/prisma/client";
import { buildBackfillPlan } from "./media-audit/backfill-plan";
import { configHash, inspectSource } from "./media-audit/references";
import type { AuditConfig, Snapshot } from "./media-audit/types";
import { assertCandidate, assertLocalBackfillUrl, registerLegacyRehearsal, REHEARSAL_HOLD } from "./media-backfill/register";
import { assertObservedHead, verifyLegacyObject, type LegacyReadStore } from "./media-backfill/verify";
import { authorizeRegisteredMedia, listMediaLibrary } from "../src/lib/media/library";

type Check = (name: string, work: () => Promise<unknown>) => Promise<void>;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const observed = { byteSize: PNG.length, etag: '"fixture-etag"', lastModified: "2026-10-09T00:00:00.000Z" };

export async function runMediaBackfillIntegration(db: PrismaClient, check: Check) {
  const temp = await mkdtemp(path.join(os.tmpdir(), "media-backfill-test-"));
  const store: LegacyReadStore = { head: async () => observed, download: async (_b, _k, _h, destination) => { await writeFile(destination, PNG, { flag: "wx", mode: 0o600 }); } };
  async function fixture() {
    await db.user.upsert({ where: { id: "backfill-admin" }, create: { id: "backfill-admin", email: "backfill-admin@example.invalid", role: "ADMIN" }, update: {} });
    const courseId = "00000000-0000-4000-8000-000000000001";
    const parent = await db.module.create({ data: { courseId, title: "Backfill fixture" } });
    const lesson = await db.lesson.create({ data: { moduleId: parent.id, title: "Backfill fixture" } });
    const urlKey = `courses/${courseId}/lessons/${lesson.id}/images/fixture.png`, objectKey = "old/" + urlKey;
    const url = `/api/media/r2?key=${encodeURIComponent(urlKey)}`;
    const config: AuditConfig = { appOrigin: "https://app.example.invalid", keyAliases: [{ urlKey, objectKey, bucket: "backfill-test" }] };
    const body = `![fixture](${url})\n![again](${url})`;
    const metadata = { blocknote: { blocks: [1, 2].map(n => ({ id: String(n), type: "image", props: { url } })) } };
    const content = await db.content.create({ data: { lessonId: lesson.id, type: "HTML", body, metadata } });
    const entitlement = await db.coachingEntitlement.create({ data: { userId: "student", coachId: "teacher", coachingOfferingId: "offering", totalSessions: 1, validUntil: new Date("2099-01-01") } });
    const session = await db.coachingSession.create({ data: { entitlementId: entitlement.id, coachId: "teacher", userId: "student", sessionNo: 1, title: "Backfill", scheduledAt: new Date(), bodyMarkdown: `![fixture](${url})`, publicationStatus: "PUBLISHED" } });
    const time = new Date().toISOString();
    const snapshot: Snapshot = { version: 1, startedAt: time, finishedAt: time, databaseSnapshot: "test", configHash: configHash(config), mediaSchema: "PRESENT", assets: [], files: [], usages: [], issues: [],
      coverage: { scanned: [], unknownColumns: [], excludedTables: [] }, contexts: { lessons: [{ id: lesson.id, courseId, editorId: "teacher" }], sessions: [{ id: session.id, editorId: "teacher" }] },
      sources: [await inspectSource(`contents:${content.id}`, content, config, [], { contentId: content.id }),
        await inspectSource(`coaching_sessions:${session.id}`, { body: session.bodyMarkdown }, config, [], { coachingSessionId: session.id })] };
    const plan = buildBackfillPlan(snapshot, { version: 1, bucket: "backfill-test", prefix: "", complete: true, startedAt: time, finishedAt: time,
      objects: [{ key: objectKey, size: String(PNG.length), etag: observed.etag, lastModified: observed.lastModified }] }, config);
    const entry = plan.entries[0];
    const verified = await verifyLegacyObject(entry, store, temp);
    return { entry, config, verified, planHash: "a".repeat(64), actors: [{ id: "teacher", previouslyAllowed: true }, { id: "backfill-admin", previouslyAllowed: true }, { id: "student", previouslyAllowed: false }, { id: "owner", previouslyAllowed: false }], content, session };
  }
  try {
    await check("backfill: LIST milliseconds match HEAD seconds but different ETag, size or second fail", async () => {
      const f = await fixture();
      const entry = { ...f.entry, observed: { ...f.entry.observed!, lastModified: "2026-10-09T00:00:00.607Z" } };
      assertObservedHead(entry, observed);
      for (const head of [{ ...observed, etag: "other" }, { ...observed, byteSize: PNG.length + 1 },
        { ...observed, lastModified: "2026-10-09T00:00:01.000Z" }, { ...observed, lastModified: "invalid" }]) {
        assert.throws(() => assertObservedHead(entry, head), /BACKFILL_OBJECT_CHANGED/);
      }
    });
    await check("backfill: production/app URLs, host overrides and arbitrary databases are refused", async () => {
      assert.equal(assertLocalBackfillUrl("postgresql://u:p@127.0.0.1:54701/media_backfill_rehearsal_test?schema=public"), "media_backfill_rehearsal_test");
      for (const url of ["postgresql://u@db:5432/media_backfill_rehearsal_test", "postgresql://u@127.0.0.1:54701/online_glia", "postgresql://u@127.0.0.1:54701/source_snapshot", "postgresql://u@127.0.0.1:54701/media_backfill_rehearsal_test?host=remote", "postgresql://u@localhost:54701/media_backfill_rehearsal_test"]) assert.throws(() => assertLocalBackfillUrl(url));
    });
    await check("backfill: decoded object registers one UNCLASSIFIED asset and two mirrored usages without changing bodies", async () => {
      const f = await fixture(); const result = await registerLegacyRehearsal(db, f);
      assert(result.created); assert.equal(result.usages, 2); assert(result.addedViewers.includes("student"));
      const file = await db.mediaFile.findUniqueOrThrow({ where: { id: result.fileId }, include: { asset: true } });
      assert.equal(file.asset.scope, "UNCLASSIFIED"); assert.equal(file.asset.ownerUserId, null); assert.equal(file.asset.retentionHold, REHEARSAL_HOLD);
      assert.equal(file.objectKey, f.entry.objectKey); assert.equal(file.urlKey, f.entry.urlKeys[0]); assert.equal(file.sha256, createHash("sha256").update(PNG).digest("hex"));
      assert.equal(await db.mediaUsage.count({ where: { assetId: result.assetId } }), 2);
      assert.equal((await db.mediaUsage.findFirstOrThrow({ where: { assetId: result.assetId, contentId: f.content.id } })).occurrenceCount, 2);
      assert.deepEqual(await db.content.findUnique({ where: { id: f.content.id } }), f.content);
      assert.deepEqual(await db.coachingSession.findUnique({ where: { id: f.session.id } }), f.session);
      await authorizeRegisteredMedia(db, "student", file, { coachingSessionId: f.session.id });
      await assert.rejects(authorizeRegisteredMedia(db, "owner", file));
      for (const scope of ["SHARED", "PERSONAL"]) assert(!(await listMediaLibrary(db, "teacher", { scope })).items.some(i => i.id === result.assetId));
      assert.equal(await db.mediaUpload.count({ where: { fileId: result.fileId } }), 0);
      assert.equal(await db.mediaDeletionJob.count({ where: { assetId: result.assetId } }), 0);
      assert.equal(await db.auditLog.count({ where: { entityId: result.assetId, action: "MEDIA_LEGACY_REHEARSED" } }), 1);
      assert.deepEqual(await readdir(temp), []);
    });
    await check("backfill: repeated and concurrent registration reuse file, usages and audit", async () => {
      const f = await fixture();
      const results = await Promise.all([registerLegacyRehearsal(db, f), registerLegacyRehearsal(db, f)]);
      assert.equal(results.filter(r => r.created).length, 1); assert.equal(results[0].assetId, results[1].assetId);
      assert.equal((await registerLegacyRehearsal(db, f)).created, false);
      assert.equal(await db.auditLog.count({ where: { entityId: results[0].assetId, action: "MEDIA_LEGACY_REHEARSED" } }), 1);
    });
    await check("backfill: administrator retains access to an unclassified coaching-only asset", async () => {
      const f = await fixture();
      await db.content.update({ where: { id: f.content.id }, data: { body: "No media", metadata: {} } });
      f.entry.expectedUsages = f.entry.expectedUsages.filter(u => "coachingSessionId" in u.target);
      const result = await registerLegacyRehearsal(db, f);
      const file = await db.mediaFile.findUniqueOrThrow({ where: { id: result.fileId }, include: { asset: true } });
      await authorizeRegisteredMedia(db, "backfill-admin", file);
      await authorizeRegisteredMedia(db, "backfill-admin", file, { coachingSessionId: f.session.id });
      await assert.rejects(authorizeRegisteredMedia(db, "backfill-admin", file, { contentId: f.content.id }));
    });
    await check("backfill: changed source version refuses registration", async () => {
      const f = await fixture(); await db.content.update({ where: { id: f.content.id }, data: { body: "changed" } });
      await assert.rejects(registerLegacyRehearsal(db, f), e => (e as { code?: string }).code === "BODY_CONFLICT");
      assert.equal(await db.mediaFile.count({ where: { objectKey: f.entry.objectKey } }), 0);
    });
    await check("backfill: access loss after creating usages rolls back asset, file, usages and audit", async () => {
      const f = await fixture(); const before = [await db.mediaAsset.count(), await db.mediaFile.count(), await db.mediaUsage.count(), await db.auditLog.count()];
      f.actors.find(a => a.id === "owner")!.previouslyAllowed = true;
      await assert.rejects(registerLegacyRehearsal(db, f), /BACKFILL_ACCESS_REGRESSION/);
      assert.deepEqual([await db.mediaAsset.count(), await db.mediaFile.count(), await db.mediaUsage.count(), await db.auditLog.count()], before);
    });
    await check("backfill: missing, external, ambiguous and forged metadata candidates cannot register", async () => {
      const f = await fixture();
      for (const entry of [{ ...f.entry, decision: "BLOCKED_MISSING_OBJECT" }, { ...f.entry, externalSources: ["posts:x"] }, { ...f.entry, urlKeys: [...f.entry.urlKeys, "second"] }]) assert.throws(() => assertCandidate(entry, f.config));
      await assert.rejects(registerLegacyRehearsal(db, { ...f, verified: { ...f.verified, etag: "changed" } }), /BACKFILL_VERIFICATION_MISMATCH/);
      assert.equal(await db.mediaFile.count({ where: { objectKey: f.entry.objectKey } }), 0);
    });
    await check("backfill: changed storage after download and invalid full content leave no local bodies or DB rows", async () => {
      const f = await fixture(); let heads = 0;
      await assert.rejects(verifyLegacyObject(f.entry, { ...store, head: async () => ++heads === 1 ? observed : { ...observed, etag: "changed" } }, temp), /BACKFILL_OBJECT_CHANGED/);
      const corrupt = Buffer.alloc(PNG.length); PNG.copy(corrupt, 0, 0, 16);
      await assert.rejects(verifyLegacyObject(f.entry, { ...store, download: async (_b, _k, _h, destination) => { await writeFile(destination, corrupt); } }, temp));
      assert.deepEqual(await readdir(temp), []); assert.equal(await db.mediaFile.count({ where: { objectKey: f.entry.objectKey } }), 0);
    });
    await check("backfill: an existing registration with different content or lost usage is never overwritten", async () => {
      const f = await fixture(); const r = await registerLegacyRehearsal(db, f);
      await assert.rejects(registerLegacyRehearsal(db, { ...f, verified: { ...f.verified, sha256: "b".repeat(64) } }), /BACKFILL_EXISTING_FILE_CONFLICT/);
      await db.mediaUsage.deleteMany({ where: { assetId: r.assetId } });
      await assert.rejects(registerLegacyRehearsal(db, f), /BACKFILL_USAGE_CONFLICT/);
    });
  } finally { await rm(temp, { recursive: true, force: true }); }
}
