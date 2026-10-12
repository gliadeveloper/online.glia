import "server-only";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api";
import { extractMediaReferences, type MediaReference } from "./body-references";
import { mediaBodyVersion, type MediaBody } from "./body-version";

type Tx = Prisma.TransactionClient;
export type MediaTarget = { contentId: string; coachingSessionId?: never } | { coachingSessionId: string; contentId?: never };

export async function withMediaTransaction<T>(db: PrismaClient, work: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async tx => {
        // Keep DateTime parameters/result text aligned even with injected clients
        // or poolers that do not retain connection startup options.
        await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
        return work(tx);
      }, { isolationLevel: "ReadCommitted", timeout: 15000 });
    }
    catch (error) {
      // Retry the entire transaction only after PostgreSQL aborted it.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt >= 2) throw error;
    }
  }
}

export async function assertMediaEditor(tx: Tx, actorId: string, ownerId?: string) {
  const user = await tx.user.findUnique({ where: { id: actorId }, select: { role: true, status: true } });
  if (!user || user.status !== "ACTIVE" || (user.role !== "ADMIN" && (user.role !== "COACH" || (ownerId !== undefined && ownerId !== actorId)))) {
    throw new ApiError("편집 권한이 없습니다.", 403, "FORBIDDEN");
  }
  return user;
}

export async function assertBodyVersion(before: MediaBody, expected: string | undefined) {
  if (typeof expected !== "string" || !/^[0-9a-f]{64}$/.test(expected)) {
    throw new ApiError("최신 본문을 불러온 뒤 다시 저장해 주세요.", 428, "BODY_VERSION_REQUIRED");
  }
  if (await mediaBodyVersion(before) !== expected) {
    throw new ApiError("다른 곳에서 본문이 수정되었습니다. 작성한 내용을 보관하고 새로고침해 주세요.", 409, "BODY_CONFLICT");
  }
}

/** Parent locks prevent concurrent creation from escaping a subtree deletion. */
export async function lockLessonForMedia(tx: Tx, lessonId: string, actorId: string, exclusive = false) {
  const location = await tx.lesson.findUnique({ where: { id: lessonId }, select: { moduleId: true } });
  if (!location) throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
  await tx.$queryRaw`SELECT id FROM modules WHERE id = ${location.moduleId} FOR KEY SHARE`;
  await tx.$queryRaw(Prisma.sql`SELECT id FROM lessons WHERE id = ${lessonId} ${exclusive ? Prisma.sql`FOR UPDATE` : Prisma.sql`FOR KEY SHARE`}`);
  const lesson = await tx.lesson.findUnique({ where: { id: lessonId }, include: { module: { include: { course: { select: { instructorId: true } } } } } });
  if (!lesson) throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
  if (lesson.moduleId !== location.moduleId) throw new ApiError("수업 구성이 변경되었습니다.", 409, "BODY_CONFLICT");
  await assertMediaEditor(tx, actorId, lesson.module.course.instructorId);
  return lesson;
}

export async function lockContentForMedia(tx: Tx, contentId: string, actorId: string) {
  const location = await tx.content.findUnique({ where: { id: contentId }, select: { lessonId: true } });
  if (!location) throw new ApiError("Content not found", 404, "CONTENT_NOT_FOUND");
  await lockLessonForMedia(tx, location.lessonId, actorId);
  await tx.$queryRaw`SELECT id FROM contents WHERE id = ${contentId} FOR UPDATE`;
  const content = await tx.content.findUnique({ where: { id: contentId } });
  if (!content) throw new ApiError("Content not found", 404, "CONTENT_NOT_FOUND");
  return content;
}

async function lockAssets(tx: Tx, assetIds: Iterable<string>) {
  const ids = [...new Set(assetIds)].sort();
  if (ids.length) await tx.$queryRaw`SELECT id FROM media_assets WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
  return ids;
}

export async function recalculateMediaDeletion(tx: Tx, ids: string[], actorId: string) {
  // All affected assets must already be locked, before any job/usage mutations.
  for (const id of ids) {
    const asset = await tx.mediaAsset.findUniqueOrThrow({ where: { id }, include: { _count: { select: { usages: true } }, deletionJob: true } });
    if (asset.storageStatus !== "READY") continue;
    const eligible = asset.libraryStatus === "TRASHED" && asset.scope !== "UNCLASSIFIED" && !asset.retentionHold && asset._count.usages === 0;
    if (!eligible) {
      if (asset.deletionJob?.status === "SCHEDULED") {
        await tx.mediaDeletionJob.update({ where: { id: asset.deletionJob.id }, data: { status: "CANCELLED" } });
      }
    } else {
      const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      const nextAttemptAt = new Date(Math.max(asset.trashExpiresAt!.getTime(), now.getTime()));
      if (!asset.deletionJob) {
        await tx.mediaDeletionJob.create({ data: { assetId: id, requestedById: actorId, nextAttemptAt } });
      } else if (["SCHEDULED", "CANCELLED"].includes(asset.deletionJob.status)) {
        await tx.mediaDeletionJob.update({ where: { id: asset.deletionJob.id }, data: { status: "SCHEDULED", nextAttemptAt, requestedById: actorId } });
      }
    }
  }
}

export async function syncMediaUsages(tx: Tx, params: { actorId: string; target: MediaTarget; before: MediaBody; after: MediaBody }) {
  const { actorId, target, before, after } = params;
  await assertMediaEditor(tx, actorId);
  const previousRefs = extractMediaReferences(before);
  const nextRefs = extractMediaReferences(after);
  const keys = [...new Set([...previousRefs.flat(), ...nextRefs.flat()].flatMap(r => r.key ? [r.key] : []))];
  const files = keys.length ? await tx.mediaFile.findMany({ where: { urlKey: { in: keys } }, select: { assetId: true, urlKey: true, status: true } }) : [];
  const fileByKey = new Map(files.map(file => [file.urlKey, file]));
  function assetFor(ref: MediaReference) {
    const fromFile = ref.key ? fileByKey.get(ref.key)?.assetId : undefined;
    if (ref.assetId && fromFile && ref.assetId !== fromFile) throw new ApiError("자산과 파일 주소가 일치하지 않습니다.", 400, "INVALID_MEDIA_REFERENCE");
    return ref.assetId ?? fromFile;
  }
  const existing = await tx.mediaUsage.findMany({ where: target });
  const existingIds = new Set(existing.map(row => row.assetId));
  const previousIds = new Set(previousRefs.flat().map(assetFor).filter((id): id is string => Boolean(id)));
  const previousKeys = new Set(previousRefs.flat().flatMap(r => r.key ? [r.key] : []));
  const counts = new Map<string, number>();
  const unresolved = new Set<string>();
  for (const group of nextRefs) {
    const groupCounts = new Map<string, number>();
    for (const ref of group) {
      const id = assetFor(ref);
      if (ref.key && ref.key.startsWith("media/staging/")) throw new ApiError("준비 중인 파일은 본문에 넣을 수 없습니다.", 400, "MEDIA_NOT_READY");
      const file = ref.key ? fileByKey.get(ref.key) : undefined;
      if (file && file.status !== "READY") throw new ApiError("사용할 수 없는 파일입니다.", 409, "MEDIA_NOT_READY");
      if (ref.key && !file) {
        // Unregistered legacy uploads remain usable while the inventory is backfilled.
        // New canonical keys and assetId/unknown URL pairs must never bypass validation.
        if (ref.assetId || !/^(courses\/[^/]+\/lessons\/[^/]+\/|coaching\/[^/]+\/)/.test(ref.key)) {
          throw new ApiError("등록되지 않은 미디어입니다.", 409, "MEDIA_NOT_REGISTERED");
        }
        unresolved.add(ref.key);
      }
      if (id) groupCounts.set(id, (groupCounts.get(id) ?? 0) + 1);
    }
    for (const [id, count] of groupCounts) counts.set(id, Math.max(counts.get(id) ?? 0, count));
  }
  // Newly pasted, unregistered legacy files may only belong to this editing context.
  if (unresolved.size) {
    const content = target.contentId ? await tx.content.findUniqueOrThrow({ where: { id: target.contentId }, select: { lessonId: true } }) : null;
    for (const key of unresolved) {
      if (previousKeys.has(key)) continue;
      const local = content ? key.match(/^courses\/[^/]+\/lessons\/([^/]+)\//)?.[1] === content.lessonId
        : key.match(/^coaching\/([^/]+)\//)?.[1] === target.coachingSessionId;
      if (!local) throw new ApiError("다른 콘텐츠의 자료는 보관함 등록 후 선택해 주세요.", 409, "MEDIA_NOT_REGISTERED");
    }
  }
  const ids = await lockAssets(tx, [...existingIds, ...previousIds, ...counts.keys()]);
  const assets = await tx.mediaAsset.findMany({ where: { id: { in: ids } } });
  const byId = new Map(assets.map(asset => [asset.id, asset]));
  for (const [id] of counts) {
    const asset = byId.get(id);
    if (!asset || asset.storageStatus !== "READY") throw new ApiError("준비가 끝난 자료만 사용할 수 있습니다.", 409, "MEDIA_NOT_READY");
    const retained = existingIds.has(id) || (asset.layout === "LEGACY" && previousIds.has(id));
    if (!retained && (asset.libraryStatus !== "ACTIVE" || asset.scope === "UNCLASSIFIED" || (asset.scope === "PERSONAL" && asset.ownerUserId !== actorId))) {
      throw new ApiError("이 자료를 새로 넣을 권한이 없습니다.", 403, "MEDIA_SELECTION_FORBIDDEN");
    }
  }
  // File state may change while waiting for the parent asset lock.
  const selectedKeys = nextRefs.flat().flatMap(r => r.key && fileByKey.has(r.key) ? [r.key] : []);
  if (selectedKeys.length && await tx.mediaFile.count({ where: { urlKey: { in: selectedKeys }, status: { not: "READY" } } })) {
    throw new ApiError("사용할 수 없는 파일입니다.", 409, "MEDIA_NOT_READY");
  }
  for (const usage of existing) {
    const count = counts.get(usage.assetId);
    if (!count) await tx.mediaUsage.delete({ where: { id: usage.id } });
    else if (count !== usage.occurrenceCount) await tx.mediaUsage.update({ where: { id: usage.id }, data: { occurrenceCount: count } });
  }
  for (const [assetId, occurrenceCount] of counts) {
    if (!existingIds.has(assetId)) await tx.mediaUsage.create({ data: { ...target, assetId, occurrenceCount } });
  }
  await recalculateMediaDeletion(tx, ids, actorId);
  await tx.auditLog.create({ data: {
    actorId, entityType: target.contentId ? "Content" : "CoachingSession", entityId: target.contentId ?? target.coachingSessionId!, action: "MEDIA_USAGES_SYNCED",
    metadata: { assetCount: counts.size, unresolvedReferenceCount: unresolved.size, needsMediaBackfill: unresolved.size > 0 },
  } });
}

/** Call after locking every target in ID order, before deleting any parent. */
export async function removeMediaUsages(tx: Tx, targets: MediaTarget[], actorId: string) {
  if (!targets.length) return;
  const usages = await tx.mediaUsage.findMany({ where: { OR: targets } });
  const ids = await lockAssets(tx, usages.map(row => row.assetId));
  await tx.mediaUsage.deleteMany({ where: { OR: targets } });
  await recalculateMediaDeletion(tx, ids, actorId);
}
