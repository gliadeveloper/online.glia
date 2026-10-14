import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api";
import { parseAvatarMediaObjectKey } from "./avatar-image";
import { parseCommunityMediaObjectKey } from "./community-media";
import { parseProductImageObjectKey } from "./product-image";
import { authorizeRegisteredMedia } from "./library";
import { assertR2MediaAccess } from "./r2-media-access";
import { isLegacyR2Key, legacyR2ObjectKey } from "./r2-key";
import type { MediaTarget } from "./usage-sync";

export type MediaLocation = { objectKey: string; isPublic: boolean; mimeType?: string };

export async function resolveMediaLocation(db: PrismaClient, url: URL, actor: () => Promise<string>, bucket: string | undefined, legacyKeyPrefix = ""): Promise<MediaLocation> {
  const keys = url.searchParams.getAll("key");
  const key = keys[0];
  if (keys.length !== 1 || !key || key.length > 1024 || key.startsWith("/") || key.split("/").some(x => x === "." || x === "..") || /[\\\u0000-\u001f]/.test(key)) {
    throw new ApiError("파일 주소가 올바르지 않습니다.", 400, "VALIDATION_ERROR");
  }
  if (key.startsWith("media/staging/") || key.startsWith("staging/")) throw new ApiError("파일을 찾지 못했습니다.", 404, "MEDIA_NOT_FOUND");
  const contentId = url.searchParams.get("contentId");
  const coachingSessionId = url.searchParams.get("coachingSessionId");
  if ((url.searchParams.has("contentId") && !contentId) || (url.searchParams.has("coachingSessionId") && !coachingSessionId) ||
      url.searchParams.getAll("contentId").length > 1 || url.searchParams.getAll("coachingSessionId").length > 1 || (contentId && coachingSessionId)) throw new ApiError("사용처가 올바르지 않습니다.", 400, "VALIDATION_ERROR");
  const target: MediaTarget | undefined = contentId ? { contentId } : coachingSessionId ? { coachingSessionId } : undefined;
  const legacyObjectKey = isLegacyR2Key(key) ? legacyR2ObjectKey(key, legacyKeyPrefix) : null;
  const physicalKeys = [...new Set([key, ...(legacyObjectKey ? [legacyObjectKey] : [])])];
  const matches = await db.mediaFile.findMany({
    // A legacy URL that resolves to a registered physical object must use that
    // asset's permissions, even when its stored URL alias differs.
    where: { OR: [{ urlKey: key }, ...(bucket ? [{ bucket, objectKey: { in: physicalKeys } }] : [])] },
    include: { asset: true }, take: 2,
  });
  if (matches.length > 1) throw new ApiError("파일 주소를 확인할 수 없습니다.", 404, "MEDIA_NOT_FOUND");
  const file = matches[0];
  if (file) {
    await authorizeRegisteredMedia(db, await actor(), file, target);
    // A key is meaningful only within its recorded bucket. Never silently read
    // an identically named object in the current environment's other bucket.
    if (!bucket || file.bucket !== bucket) throw new ApiError("파일 저장소 설정을 확인해 주세요.", 503, "MEDIA_BUCKET_MISMATCH");
    return { objectKey: file.objectKey, isPublic: false, mimeType: file.mimeType ?? undefined };
  }
  if (key.startsWith("media/") || target) throw new ApiError("파일을 찾지 못했습니다.", 404, "MEDIA_NOT_FOUND");
  const isPublic = Boolean(
    parseAvatarMediaObjectKey(key) || parseCommunityMediaObjectKey(key) || parseProductImageObjectKey(key),
  );
  if (!isPublic) await assertR2MediaAccess(await actor(), key);
  if (!legacyObjectKey) throw new ApiError("파일을 찾지 못했습니다.", 404, "MEDIA_NOT_FOUND");
  return { objectKey: legacyObjectKey, isPublic };
}
