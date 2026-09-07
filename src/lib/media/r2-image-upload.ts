import { ApiError } from "@/lib/api";

import {
  ALLOWED_LESSON_IMAGE_TYPES,
  LESSON_MEDIA_TYPE_ERROR,
  lessonMediaKind,
  lessonMediaSizeError,
  maxLessonMediaBytes,
} from "./lesson-image-constants";
import {
  buildCoachingImageObjectKey,
  buildCoachingVideoObjectKey,
  buildLessonImageObjectKey,
  buildLessonVideoObjectKey,
} from "./content-metadata";
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

export function assertLessonMediaContentType(contentType: string) {
  if (!lessonMediaKind(contentType)) {
    throw new ApiError(LESSON_MEDIA_TYPE_ERROR, 400, "VALIDATION_ERROR");
  }
}

function buildLessonMediaObjectKey(params: {
  courseId: string;
  lessonId: string;
  fileName: string;
  contentType: string;
}) {
  if (lessonMediaKind(params.contentType) === "video") {
    return buildLessonVideoObjectKey(params);
  }

  return buildLessonImageObjectKey(params);
}

export async function createLessonImageUpload(params: {
  courseId: string;
  lessonId: string;
  fileName: string;
  contentType: string;
}) {
  requireR2Config();
  assertLessonMediaContentType(params.contentType);

  const objectKey = buildLessonMediaObjectKey(params);

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
  const kind = lessonMediaKind(params.contentType);
  if (!kind) {
    throw new ApiError(LESSON_MEDIA_TYPE_ERROR, 400, "VALIDATION_ERROR");
  }

  if (params.buffer.byteLength > maxLessonMediaBytes(kind)) {
    throw new ApiError(lessonMediaSizeError(kind), 400, "VALIDATION_ERROR");
  }

  requireR2Config();

  const objectKey = buildLessonMediaObjectKey(params);

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
  const kind = lessonMediaKind(params.contentType);
  if (!kind) {
    throw new ApiError(LESSON_MEDIA_TYPE_ERROR, 400, "VALIDATION_ERROR");
  }

  if (params.buffer.byteLength > maxLessonMediaBytes(kind)) {
    throw new ApiError(lessonMediaSizeError(kind), 400, "VALIDATION_ERROR");
  }

  requireR2Config();

  const objectKey =
    kind === "video"
      ? buildCoachingVideoObjectKey(params)
      : buildCoachingImageObjectKey(params);

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
