import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api";
import { assertMediaEditor, type MediaTarget } from "./usage-sync";

export function libraryMediaUrl(urlKey: string) {
  return `/api/media/r2?key=${encodeURIComponent(urlKey)}`;
}

export async function listMediaLibrary(db: PrismaClient, actorId: string, options: {
  scope?: string; kind?: string; cursor?: string; limit?: number; status?: string;
} = {}) {
  const actor = await assertMediaEditor(db, actorId);
  const { scope = "PERSONAL", status = "ACTIVE", kind, cursor, limit = 30 } = options;
  if (!["ACTIVE", "TRASHED"].includes(status) || !["PERSONAL", "SHARED"].includes(scope) || (kind && !["IMAGE", "VIDEO", "AUDIO"].includes(kind)) ||
      !Number.isInteger(limit) || limit < 1 || limit > 100) throw new ApiError("목록 조건이 올바르지 않습니다.", 400, "VALIDATION_ERROR");
  if (status === "TRASHED" && scope === "SHARED" && actor.role !== "ADMIN") throw new ApiError("공통 자료 휴지통은 관리자만 볼 수 있습니다.", 403, "MEDIA_MANAGEMENT_FORBIDDEN");
  let after: { id: string } | undefined;
  if (cursor) {
    try {
      if (cursor.length > 400) throw new Error();
      after = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
      if (!after || typeof after.id !== "string" || !after.id || after.id.length > 100) throw new Error();
    } catch { throw new ApiError("페이지 정보가 올바르지 않습니다.", 400, "VALIDATION_ERROR"); }
  }
  const rows = await db.mediaAsset.findMany({
    where: {
      scope, ...(scope === "PERSONAL" ? { ownerUserId: actorId } : {}),
      libraryStatus: status, storageStatus: "READY", ...(kind ? { kind } : {}),
    },
    // Let PostgreSQL read the cursor row's exact timestamp. JS Date loses the
    // microseconds in timestamptz(6), which otherwise skips same-ms uploads.
    ...(after ? { cursor: { id: after.id }, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1,
    select: {
      id: true, scope: true, kind: true, originalName: true, createdAt: true,
      libraryStatus: true, updatedAt: true, trashedAt: true, trashExpiresAt: true,
      _count: { select: { usages: true } },
      files: { where: { status: "READY", verifiedAt: { not: null }, OR: [{ role: "ORIGINAL" }, { isCurrent: true }] },
        select: { id: true, role: true, mimeType: true, byteSize: true, urlKey: true } },
    },
  });
  const visible = rows.slice(0, limit);
  const last = visible.at(-1);
  return {
    items: visible.map(({ files, updatedAt, trashedAt, trashExpiresAt, _count, ...asset }) => ({ ...asset,
      version: updatedAt.toISOString(), trashedAt: trashedAt?.toISOString() ?? null, trashExpiresAt: trashExpiresAt?.toISOString() ?? null,
      usageCount: _count.usages, canManage: scope === "PERSONAL" || actor.role === "ADMIN",
      createdAt: asset.createdAt.toISOString(), files: files.map(({ urlKey, byteSize, ...file }) => ({ ...file, byteSize: byteSize?.toString() ?? null, url: libraryMediaUrl(urlKey) })) })),
    nextCursor: rows.length > limit && last ? Buffer.from(JSON.stringify({ id: last.id })).toString("base64url") : null,
  };
}

export type RegisteredMedia = Prisma.MediaFileGetPayload<{ include: { asset: true } }>;

/** Explicit context requires that exact usage; a context-free saved URL may use
 * any viewable usage or a library preview. Never infer access from an R2 prefix.
 */
export async function authorizeRegisteredMedia(db: PrismaClient, userId: string, file: RegisteredMedia, target?: MediaTarget) {
  const unavailable = () => new ApiError("파일을 찾지 못했습니다.", 404, "MEDIA_NOT_FOUND");
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, status: true } });
  if (!user || user.status !== "ACTIVE") throw unavailable();
  const asset = file.asset;
  if (file.status !== "READY" || !file.verifiedAt || asset.storageStatus !== "READY") throw unavailable();
  const editor = user.role === "ADMIN" || user.role === "COACH";
  const preview = editor && (
    (asset.scope === "PERSONAL" && asset.ownerUserId === userId) ||
    (asset.scope === "SHARED" && (asset.libraryStatus === "ACTIVE" || user.role === "ADMIN"))
  );
  if (!target && preview) return;

  const now = new Date();
  const courseView: Prisma.CourseWhereInput = user.role === "ADMIN" ? {} : {
    OR: [
      ...(user.role === "COACH" ? [{ instructorId: userId }] : []),
      { enrollments: { some: { userId, status: { in: ["ACTIVE", "COMPLETED"] }, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }] } } },
    ],
  };
  // Published historical feedback remains readable after entitlement expiry,
  // matching the current coaching product policy.
  const sessionView: Prisma.CoachingSessionWhereInput = user.role === "ADMIN" ? {} : {
    OR: [
      ...(user.role === "COACH" ? [{ coachId: userId }] : []),
      { userId, publicationStatus: "PUBLISHED" },
    ],
  };
  const usage = await db.mediaUsage.findFirst({
    // Admins may read an existing usage of either kind. An empty relation
    // filter inside OR is pruned by Prisma and can drop the coaching branch.
    // Keep asset/explicit-target checks, without an empty access predicate.
    where: { assetId: asset.id, ...target, ...(user.role === "ADMIN" ? {} : { OR: [
      { content: { lesson: { module: { course: courseView } } } },
      { coachingSession: sessionView },
    ] }) }, select: { id: true },
  });
  if (!usage) throw unavailable();
}
