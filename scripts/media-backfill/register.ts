import type { PrismaClient } from "../../src/generated/prisma/client";
import { authorizeRegisteredMedia } from "../../src/lib/media/library";
import { assertBodyVersion, withMediaTransaction } from "../../src/lib/media/usage-sync";
import type { buildBackfillPlan } from "../media-audit/backfill-plan";
import { inspectSource, keyRef } from "../media-audit/references";
import type { AuditConfig } from "../media-audit/types";
import { libraryMediaRule, type LibraryMimeType } from "../../src/lib/media/content-signature";

export type Entry = ReturnType<typeof buildBackfillPlan>["entries"][number];
export type VerifiedLegacy = {
  bucket: string; objectKey: string; byteSize: number; etag: string; sha256: string;
  mimeType: LibraryMimeType; metadataCheckedAt: Date; verifiedAt: Date;
};
export const REHEARSAL_HOLD = "LEGACY_BACKFILL_REHEARSAL";

/** No arbitrary app/production URL, query-host override, socket, or credential fallback. */
export function assertLocalBackfillUrl(value: string) {
  const url = new URL(value);
  if (!/^postgres(?:ql)?:$/.test(url.protocol) || url.hostname !== "127.0.0.1" || !url.port ||
      !/^\/media_backfill_rehearsal_[a-z0-9_]+$/.test(url.pathname) ||
      [...url.searchParams].some(([key, value]) => key !== "schema" || value !== "public") || url.hash) {
    throw new Error("LOCAL_BACKFILL_DATABASE_REQUIRED");
  }
  return url.pathname.slice(1);
}

export function assertCandidate(entry: Entry, config: AuditConfig) {
  if (!["REVIEW_FOR_REGISTRATION", "KEEP_REGISTERED"].includes(entry.decision) || entry.reviews.length ||
      entry.externalSources.length || entry.possibleSources.length || entry.urlKeys.length !== 1 ||
      !entry.expectedUsages.length || !entry.observed?.etag || !entry.observed.lastModified ||
      entry.keyRef !== keyRef(entry.bucket, entry.objectKey) ||
      !/^(coaching\/[^/]+\/(images|videos|audio)\/|courses\/[^/]+\/lessons\/[^/]+\/(images|videos|audio)\/)/.test(entry.urlKeys[0])) {
    throw new Error("BACKFILL_REVIEW_REQUIRED");
  }
  const alias = config.keyAliases?.find(a => a.urlKey === entry.urlKeys[0]);
  if (!alias || alias.bucket !== entry.bucket || alias.objectKey !== entry.objectKey) throw new Error("BACKFILL_MAPPING_REQUIRED");
  const targets = new Set<string>();
  for (const use of entry.expectedUsages) {
    const id = JSON.stringify(use.target);
    if (targets.has(id) || !use.expectedBodyVersion || !/^[0-9a-f]{64}$/.test(use.expectedBodyVersion) ||
        !Number.isSafeInteger(use.occurrenceCount) || use.occurrenceCount < 1 ||
        Object.keys(use.target).length !== 1 || !("contentId" in use.target || "coachingSessionId" in use.target)) throw new Error("BACKFILL_SOURCE_INVALID");
    targets.add(id);
  }
}

/** Only called by the guarded local rehearsal CLI. No storage mutation or body rewrite.
 * Parent content locks precede the object/asset lock, matching editor transactions.
 * A failed access check rolls back the entire file + usages + audit registration.
 */
export async function registerLegacyRehearsal(db: PrismaClient, input: {
  entry: Entry; config: AuditConfig; verified: VerifiedLegacy; planHash: string;
  actors: { id: string; previouslyAllowed: boolean }[];
}) {
  const { entry, config, verified: v, planHash, actors } = input;
  assertCandidate(entry, config);
  const rule = libraryMediaRule(v.mimeType);
  if (!rule || !/^[a-f0-9]{64}$/.test(v.sha256) || !/^[a-f0-9]{64}$/.test(planHash) ||
      v.bucket !== entry.bucket || v.objectKey !== entry.objectKey || v.etag !== entry.observed!.etag ||
      !Number.isSafeInteger(v.byteSize) || v.byteSize <= 0 || String(v.byteSize) !== entry.observed!.byteSize ||
      !Number.isFinite(v.metadataCheckedAt.getTime()) || !Number.isFinite(v.verifiedAt.getTime()) ||
      v.verifiedAt < v.metadataCheckedAt || v.verifiedAt.getTime() > Date.now() + 1000) throw new Error("BACKFILL_VERIFICATION_MISMATCH");
  if (!actors.length || new Set(actors.map(a => a.id)).size !== actors.length) throw new Error("BACKFILL_ACCESS_MATRIX_REQUIRED");
  return withMediaTransaction(db, async tx => {
    // Lock every source deterministically, then re-read both version and references.
    for (const use of [...entry.expectedUsages].sort((a, b) => a.source.localeCompare(b.source))) {
      let body;
      if ("contentId" in use.target) {
        await tx.$queryRaw`SELECT id FROM contents WHERE id = ${use.target.contentId} FOR UPDATE`;
        body = await tx.content.findUniqueOrThrow({ where: { id: use.target.contentId } });
      } else {
        await tx.$queryRaw`SELECT id FROM coaching_sessions WHERE id = ${use.target.coachingSessionId} FOR UPDATE`;
        const s = await tx.coachingSession.findUniqueOrThrow({ where: { id: use.target.coachingSessionId } });
        body = { body: s.bodyMarkdown, metadata: s.bodyMetadata };
      }
      await assertBodyVersion(body, use.expectedBodyVersion!);
      const issues: { code: string }[] = [];
      const source = await inspectSource(use.source, body, config, issues, use.target);
      const count = Math.max(0, ...source.groups.map(g => g.filter(r => r.key === entry.urlKeys[0]).length));
      if (issues.length || count !== use.occurrenceCount) throw new Error("BACKFILL_REFERENCE_CHANGED");
    }
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${entry.keyRef}, 0))`;
    const collision = await tx.mediaFile.findMany({ where: { OR: [
      { bucket: entry.bucket, objectKey: entry.objectKey }, { urlKey: entry.urlKeys[0] },
    ] } });
    if (collision.length > 1) throw new Error("BACKFILL_IDENTITY_CONFLICT");
    let file = collision[0];
    let created = false;
    if (file) {
      await tx.$queryRaw`SELECT id FROM media_assets WHERE id = ${file.assetId} FOR UPDATE`;
      file = await tx.mediaFile.findUniqueOrThrow({ where: { id: file.id } });
      const asset = await tx.mediaAsset.findUniqueOrThrow({ where: { id: file.assetId } });
      if (asset.layout !== "LEGACY" || asset.scope !== "UNCLASSIFIED" || asset.retentionHold !== REHEARSAL_HOLD ||
          asset.storageStatus !== "READY" || asset.libraryStatus !== "ACTIVE" ||
          file.role !== "ORIGINAL" || file.status !== "READY" || !file.verifiedAt ||
          file.bucket !== v.bucket || file.objectKey !== v.objectKey || file.urlKey !== entry.urlKeys[0] ||
          file.sha256 !== v.sha256 || file.etag !== v.etag || file.mimeType !== v.mimeType || file.byteSize !== BigInt(v.byteSize)) {
        throw new Error("BACKFILL_EXISTING_FILE_CONFLICT");
      }
    } else {
      const asset = await tx.mediaAsset.create({ data: {
        scope: "UNCLASSIFIED", kind: rule.kind, layout: "LEGACY", originalName: `기존 미디어.${rule.ext}`, retentionHold: REHEARSAL_HOLD,
      } });
      file = await tx.mediaFile.create({ data: {
        assetId: asset.id, role: "ORIGINAL", bucket: v.bucket, objectKey: v.objectKey, urlKey: entry.urlKeys[0],
      } });
      file = await tx.mediaFile.update({ where: { id: file.id }, data: {
        status: "READY", mimeType: v.mimeType, byteSize: BigInt(v.byteSize), sha256: v.sha256,
        etag: v.etag, metadataCheckedAt: v.metadataCheckedAt, verifiedAt: v.verifiedAt,
      } });
      await tx.mediaAsset.update({ where: { id: asset.id }, data: { storageStatus: "READY" } });
      for (const use of entry.expectedUsages) await tx.mediaUsage.create({ data: {
        assetId: asset.id, ...use.target, occurrenceCount: use.occurrenceCount,
      } });
      created = true;
    }
    const actual = await tx.mediaUsage.findMany({ where: { assetId: file.assetId } });
    if (actual.length !== entry.expectedUsages.length || entry.expectedUsages.some(use => !actual.some(row =>
      row.contentId === ("contentId" in use.target ? use.target.contentId : null) &&
      row.coachingSessionId === ("coachingSessionId" in use.target ? use.target.coachingSessionId : null) &&
      row.occurrenceCount === use.occurrenceCount))) throw new Error("BACKFILL_USAGE_CONFLICT");
    const registered = await tx.mediaFile.findUniqueOrThrow({ where: { id: file.id }, include: { asset: true } });
    const addedViewers: string[] = [];
    for (const actor of actors) {
      let allowed = false;
      try { await authorizeRegisteredMedia(tx as PrismaClient, actor.id, registered); allowed = true; }
      catch (error) { if ((error as { code?: string }).code !== "MEDIA_NOT_FOUND") throw error; }
      if (actor.previouslyAllowed && !allowed) throw new Error("BACKFILL_ACCESS_REGRESSION");
      if (!actor.previouslyAllowed && allowed) addedViewers.push(actor.id);
    }
    if (created) await tx.auditLog.create({ data: {
      actorId: null, action: "MEDIA_LEGACY_REHEARSED", entityType: "MediaAsset", entityId: file.assetId,
      metadata: { planHash, keyRef: entry.keyRef, usageCount: actual.length, addedViewers,
        sourceVersions: entry.expectedUsages.map(u => ({ source: u.source, version: u.expectedBodyVersion })) },
    } });
    return { assetId: file.assetId, fileId: file.id, created, usages: actual.length, addedViewers };
  });
}
