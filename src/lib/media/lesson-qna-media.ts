import { ApiError } from "@/lib/api";

import {
  ALLOWED_LESSON_IMAGE_TYPES,
  inferLessonMediaContentType,
  MAX_LESSON_IMAGE_BYTES,
} from "./lesson-image-constants";
import { LESSON_QNA_BODY_MAX, LESSON_QNA_IMAGE_LIMIT, LESSON_QNA_TITLE_MAX } from "./lesson-qna-limits";
import { putR2Object, requireR2Config } from "./r2";

export { LESSON_QNA_BODY_MAX, LESSON_QNA_IMAGE_LIMIT, LESSON_QNA_TITLE_MAX };

export function buildLessonQnaMediaObjectKey(params: {
  courseId: string;
  userId: string;
  fileName: string;
}) {
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "image";
  return `lesson-qna/${params.courseId}/${params.userId}/${Date.now()}-${safeName}`;
}

export function parseLessonQnaMediaObjectKey(objectKey: string): { courseId: string } | null {
  const match = objectKey.match(/^lesson-qna\/([^/]+)\//);
  if (!match) return null;
  return { courseId: match[1] };
}

export function buildLessonQnaMediaUrl(objectKey: string) {
  return `/api/media/r2?key=${encodeURIComponent(objectKey)}`;
}

export function normalizeLessonQnaTitle(title: string) {
  const trimmed = title.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    throw new ApiError("제목을 입력해 주세요.", 400, "VALIDATION_ERROR");
  }
  if (trimmed.length > LESSON_QNA_TITLE_MAX) {
    throw new ApiError(`제목은 ${LESSON_QNA_TITLE_MAX}자 이하로 적어 주세요.`, 400, "VALIDATION_ERROR");
  }
  return trimmed;
}

export function normalizeLessonQnaBody(body: string, courseId: string) {
  const trimmed = body.replace(/\r\n/g, "\n").trim();
  if (trimmed.length > LESSON_QNA_BODY_MAX) {
    throw new ApiError(`설명은 ${LESSON_QNA_BODY_MAX}자 이하로 적어 주세요.`, 400, "VALIDATION_ERROR");
  }
  if (/<\s*script|<\s*iframe|javascript:/i.test(trimmed)) {
    throw new ApiError("허용되지 않은 내용이 있습니다.", 400, "VALIDATION_ERROR");
  }

  const urls = [...trimmed.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map((match) => match[1]);
  if (urls.length > LESSON_QNA_IMAGE_LIMIT) {
    throw new ApiError(`이미지는 ${LESSON_QNA_IMAGE_LIMIT}장까지 넣을 수 있습니다.`, 400, "VALIDATION_ERROR");
  }
  for (const url of urls) {
    assertLessonQnaImageUrl(url, courseId);
  }
  return trimmed;
}

export function assertLessonQnaImageUrl(url: string, courseId: string) {
  let key: string | null = null;
  try {
    const parsed = new URL(url, "http://local");
    if (parsed.pathname !== "/api/media/r2") {
      throw new Error("path");
    }
    key = parsed.searchParams.get("key");
  } catch {
    key = null;
  }

  const parsedKey = key ? parseLessonQnaMediaObjectKey(key) : null;
  if (!parsedKey || parsedKey.courseId !== courseId) {
    throw new ApiError("이 강의에 올린 이미지만 넣을 수 있습니다.", 400, "VALIDATION_ERROR");
  }
}

export async function uploadLessonQnaImageBuffer(params: {
  courseId: string;
  userId: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}) {
  const contentType = inferLessonMediaContentType(params.fileName, params.contentType);
  if (!ALLOWED_LESSON_IMAGE_TYPES.has(contentType)) {
    throw new ApiError("이미지만 올릴 수 있습니다.", 400, "VALIDATION_ERROR");
  }
  if (params.buffer.byteLength > MAX_LESSON_IMAGE_BYTES) {
    throw new ApiError("이미지는 10MB 이하만 업로드할 수 있습니다.", 400, "VALIDATION_ERROR");
  }

  requireR2Config();
  const objectKey = buildLessonQnaMediaObjectKey({
    courseId: params.courseId,
    userId: params.userId,
    fileName: params.fileName || "image",
  });
  await putR2Object({
    objectKey,
    contentType,
    body: params.buffer,
  });

  return {
    objectKey,
    publicUrl: buildLessonQnaMediaUrl(objectKey),
  };
}
