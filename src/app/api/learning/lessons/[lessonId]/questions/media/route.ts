import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { assertLessonQnaAccess } from "@/lib/lesson-qna";
import { LESSON_QNA_IMAGE_LIMIT, uploadLessonQnaImageBuffer } from "@/lib/media/lesson-qna-media";
import { assertRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

type RouteContext = { params: Promise<{ lessonId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { lessonId } = await context.params;
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED");
    }
    assertRateLimit(`lesson-qna-media:${userId}`, 8, 60_000);
    const access = await assertLessonQnaAccess(userId, lessonId);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ApiError("이미지를 선택해 주세요.", 400, "VALIDATION_ERROR");
    }

    const uploaded = await uploadLessonQnaImageBuffer({
      courseId: access.course.id,
      userId,
      fileName: file.name || "image",
      contentType: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
    });

    return NextResponse.json({ ...uploaded, imageLimit: LESSON_QNA_IMAGE_LIMIT });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message, code: "RATE_LIMITED" }, { status: 429 });
    }
    return jsonError(error);
  }
}
