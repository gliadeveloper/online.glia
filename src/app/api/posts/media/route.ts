import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import {
  inferLessonMediaContentType,
  LESSON_MEDIA_TYPE_ERROR,
  lessonMediaKind,
  lessonMediaSizeError,
  MAX_LESSON_MEDIA_BYTES,
  maxLessonMediaBytes,
} from "@/lib/media/lesson-image-constants";
import { uploadCommunityMediaBuffer } from "@/lib/media/community-media";
import { assertRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED");
    }

    assertRateLimit(`post:media:${userId}`, 8, 60_000);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ApiError("파일을 선택해 주세요.", 400, "VALIDATION_ERROR");
    }

    if (file.size > MAX_LESSON_MEDIA_BYTES) {
      throw new ApiError(lessonMediaSizeError("video"), 400, "VALIDATION_ERROR");
    }

    const contentType = inferLessonMediaContentType(file.name, file.type);
    const kind = lessonMediaKind(contentType);

    if (!kind) {
      throw new ApiError(LESSON_MEDIA_TYPE_ERROR, 400, "VALIDATION_ERROR");
    }

    if (file.size > maxLessonMediaBytes(kind)) {
      throw new ApiError(lessonMediaSizeError(kind), 400, "VALIDATION_ERROR");
    }

    const uploaded = await uploadCommunityMediaBuffer({
      userId,
      fileName: file.name || (kind === "video" ? "video" : "image"),
      contentType,
      buffer: Buffer.from(await file.arrayBuffer()),
    });

    return NextResponse.json(uploaded);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message, code: "RATE_LIMITED" }, { status: 429 });
    }

    return jsonError(error);
  }
}
