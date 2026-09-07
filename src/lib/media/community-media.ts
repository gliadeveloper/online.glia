import { ApiError } from "@/lib/api";

import {
  LESSON_MEDIA_TYPE_ERROR,
  lessonMediaKind,
  lessonMediaSizeError,
  maxLessonMediaBytes,
  type LessonMediaKind,
} from "./lesson-image-constants";
import { putR2Object, requireR2Config } from "./r2";

export function buildCommunityMediaObjectKey(params: {
  userId: string;
  fileName: string;
  kind: LessonMediaKind;
}) {
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
  const folder = params.kind === "video" ? "videos" : "images";
  return `community/${params.userId}/${folder}/${Date.now()}-${safeName}`;
}

export function parseCommunityMediaObjectKey(objectKey: string): { userId: string } | null {
  const match = objectKey.match(/^community\/([^/]+)\//);
  if (!match) return null;
  return { userId: match[1] };
}

export function buildCommunityMediaUrl(objectKey: string) {
  return `/api/media/r2?key=${encodeURIComponent(objectKey)}`;
}

export async function uploadCommunityMediaBuffer(params: {
  userId: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}) {
  const kind = lessonMediaKind(params.contentType);
  if (!kind) {
    throw new ApiError(LESSON_MEDIA_TYPE_ERROR, 400, "VALIDATION_ERROR");
  }

  if (params.buffer.byteLength > maxLessonMediaBytes(kind)) {
    throw new ApiError(lessonMediaSizeError(kind), 400, "VALIDATION_ERROR");
  }

  requireR2Config();

  const objectKey = buildCommunityMediaObjectKey({
    userId: params.userId,
    fileName: params.fileName,
    kind,
  });

  await putR2Object({
    objectKey,
    contentType: params.contentType,
    body: params.buffer,
  });

  return {
    kind,
    objectKey,
    publicUrl: buildCommunityMediaUrl(objectKey),
  };
}
