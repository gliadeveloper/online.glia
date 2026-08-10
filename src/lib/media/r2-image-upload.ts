import { ApiError } from "@/lib/api";

import { ALLOWED_LESSON_IMAGE_TYPES, MAX_LESSON_IMAGE_BYTES } from "./lesson-image-constants";
import { buildCoachingImageObjectKey, buildLessonImageObjectKey } from "./content-metadata";
import { buildCoachingImageMediaUrl } from "./coaching-image-media";
import { buildLessonImageMediaUrl } from "./lesson-image-media";
import { createR2UploadPresignedUrl, putR2Object, requireR2Config } from "./r2";

export { MAX_LESSON_IMAGE_BYTES } from "./lesson-image-constants";

const ALLOWED_IMAGE_TYPES = ALLOWED_LESSON_IMAGE_TYPES;

export function assertLessonImageContentType(contentType: string) {
  const normalized = contentType.trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(normalized)) {
    throw new ApiError(
      "jpeg, png, webp, gif, avif 이미지만 업로드할 수 있습니다.",
      400,
      "VALIDATION_ERROR",
    );
  }
}

export async function createLessonImageUpload(params: {
  courseId: string;
  lessonId: string;
  fileName: string;
  contentType: string;
}) {
  requireR2Config();
  assertLessonImageContentType(params.contentType);

  const objectKey = buildLessonImageObjectKey({
    courseId: params.courseId,
    lessonId: params.lessonId,
    fileName: params.fileName,
  });

  const presigned = await createR2UploadPresignedUrl({
    objectKey,
    contentType: params.contentType,
  });

  return {
    ...presigned,
    objectKey,
    publicUrl: buildLessonImageMediaUrl(objectKey),
  };
}

export async function uploadLessonImageBuffer(params: {
  courseId: string;
  lessonId: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}) {
  if (params.buffer.byteLength > MAX_LESSON_IMAGE_BYTES) {
    throw new ApiError("이미지는 10MB 이하만 업로드할 수 있습니다.", 400, "VALIDATION_ERROR");
  }

  requireR2Config();
  assertLessonImageContentType(params.contentType);

  const objectKey = buildLessonImageObjectKey({
    courseId: params.courseId,
    lessonId: params.lessonId,
    fileName: params.fileName,
  });

  await putR2Object({
    objectKey,
    contentType: params.contentType,
    body: params.buffer,
  });

  return {
    objectKey,
    publicUrl: buildLessonImageMediaUrl(objectKey),
  };
}

export async function uploadCoachingImageBuffer(params: {
  sessionId: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}) {
  if (params.buffer.byteLength > MAX_LESSON_IMAGE_BYTES) {
    throw new ApiError("이미지는 10MB 이하만 업로드할 수 있습니다.", 400, "VALIDATION_ERROR");
  }

  requireR2Config();
  assertLessonImageContentType(params.contentType);

  const objectKey = buildCoachingImageObjectKey({
    sessionId: params.sessionId,
    fileName: params.fileName,
  });

  await putR2Object({
    objectKey,
    contentType: params.contentType,
    body: params.buffer,
  });

  return {
    objectKey,
    publicUrl: buildCoachingImageMediaUrl(objectKey),
  };
}
