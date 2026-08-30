import { ApiError } from "@/lib/api";

import { ALLOWED_AVATAR_IMAGE_TYPES, MAX_AVATAR_IMAGE_BYTES } from "./avatar-image-constants";
import { buildR2MediaUrl, putR2Object, requireR2Config } from "./r2";

export { MAX_AVATAR_IMAGE_BYTES } from "./avatar-image-constants";

export function buildAvatarImageObjectKey(params: { userId: string; fileName: string }) {
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `avatars/${params.userId}/${Date.now()}-${safeName}`;
}

export function parseAvatarMediaObjectKey(objectKey: string): { userId: string } | null {
  const match = objectKey.match(/^avatars\/([^/]+)\//);
  if (!match) return null;
  return { userId: match[1] };
}

export function buildAvatarImageMediaUrl(objectKey: string) {
  return buildR2MediaUrl(objectKey);
}

export function assertAvatarImageContentType(contentType: string) {
  const normalized = contentType.trim().toLowerCase();
  if (!ALLOWED_AVATAR_IMAGE_TYPES.has(normalized)) {
    throw new ApiError("jpeg, png, webp 이미지만 업로드할 수 있습니다.", 400, "VALIDATION_ERROR");
  }
}

export async function uploadAvatarImageBuffer(params: {
  userId: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}) {
  if (params.buffer.byteLength > MAX_AVATAR_IMAGE_BYTES) {
    throw new ApiError("이미지는 5MB 이하만 업로드할 수 있습니다.", 400, "VALIDATION_ERROR");
  }

  requireR2Config();
  assertAvatarImageContentType(params.contentType);

  const objectKey = buildAvatarImageObjectKey({
    userId: params.userId,
    fileName: params.fileName,
  });

  await putR2Object({
    objectKey,
    contentType: params.contentType,
    body: params.buffer,
  });

  return {
    objectKey,
    publicUrl: buildAvatarImageMediaUrl(objectKey),
  };
}
