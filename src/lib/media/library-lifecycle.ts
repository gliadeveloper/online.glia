import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { assertMediaEditor, recalculateMediaDeletion, withMediaTransaction } from "./usage-sync";

const TRASH_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

/** Only library membership changes here. Files, usages and R2 bytes are retained. */
export async function setMediaLibraryStatus(db: PrismaClient, params: {
  actorId: string; assetId: string; libraryStatus: unknown; expectedVersion: unknown;
}) {
  if (params.libraryStatus !== "ACTIVE" && params.libraryStatus !== "TRASHED") {
    throw new ApiError("보관 상태가 올바르지 않습니다.", 400, "VALIDATION_ERROR");
  }
  if (typeof params.expectedVersion !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(params.expectedVersion) || !Number.isFinite(Date.parse(params.expectedVersion))) {
    throw new ApiError("최신 자료 목록을 불러온 뒤 다시 시도해 주세요.", 428, "MEDIA_VERSION_REQUIRED");
  }
  const status = params.libraryStatus;
  return withMediaTransaction(db, async tx => {
    await tx.$queryRaw`SELECT id FROM media_assets WHERE id = ${params.assetId} FOR UPDATE`;
    // Re-read identity, ownership and state after waiting for the asset lock.
    const actor = await assertMediaEditor(tx, params.actorId);
    const asset = await tx.mediaAsset.findUnique({ where: { id: params.assetId }, include: { _count: { select: { usages: true } } } });
    if (!asset || asset.scope === "UNCLASSIFIED" || (asset.scope === "PERSONAL" && asset.ownerUserId !== params.actorId)) {
      throw new ApiError("자료를 찾지 못했습니다.", 404, "MEDIA_NOT_FOUND");
    }
    if (asset.scope === "SHARED" && actor.role !== "ADMIN") {
      throw new ApiError("공통 자료는 관리자만 정리할 수 있습니다.", 403, "MEDIA_MANAGEMENT_FORBIDDEN");
    }
    if (asset.storageStatus !== "READY") {
      throw new ApiError("준비 중이거나 삭제가 시작된 자료는 변경할 수 없습니다.", 409, "MEDIA_NOT_RESTORABLE");
    }
    if (asset.updatedAt.toISOString() !== params.expectedVersion) {
      throw new ApiError("자료 상태가 변경되었습니다. 목록을 새로고침한 뒤 다시 시도해 주세요.", 409, "MEDIA_LIBRARY_CONFLICT");
    }
    let saved = asset;
    if (asset.libraryStatus !== status) {
      const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      // A strictly increasing millisecond token prevents ACTIVE→TRASHED→ACTIVE
      // from accepting a delayed request, even within the same millisecond.
      saved = await tx.mediaAsset.update({ where: { id: asset.id }, data: {
        libraryStatus: status,
        trashedAt: status === "TRASHED" ? now : null,
        trashExpiresAt: status === "TRASHED" ? new Date(now.getTime() + TRASH_GRACE_MS) : null,
        updatedAt: new Date(Math.max(now.getTime(), asset.updatedAt.getTime() + 1)),
      }, include: { _count: { select: { usages: true } } } });
      await recalculateMediaDeletion(tx, [asset.id], params.actorId);
      await writeAuditLog({ actorId: params.actorId, entityType: "MediaAsset", entityId: asset.id,
        action: status === "TRASHED" ? "MEDIA_ASSET_TRASHED" : "MEDIA_ASSET_RESTORED",
        metadata: { scope: asset.scope, usageCount: asset._count.usages, trashExpiresAt: saved.trashExpiresAt?.toISOString() ?? null },
      }, tx);
    }
    return { id: saved.id, libraryStatus: saved.libraryStatus, version: saved.updatedAt.toISOString(),
      trashedAt: saved.trashedAt?.toISOString() ?? null, trashExpiresAt: saved.trashExpiresAt?.toISOString() ?? null };
  });
}
