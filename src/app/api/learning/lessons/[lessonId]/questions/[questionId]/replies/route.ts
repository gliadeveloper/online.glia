import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { createLessonReply } from "@/lib/lesson-qna";
import { assertRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

type RouteContext = { params: Promise<{ lessonId: string; questionId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { lessonId, questionId } = await context.params;
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED");
    }
    assertRateLimit(`lesson-qna:${userId}`, 12, 60_000);
    const body = (await request.json()) as { body?: string };
    const reply = await createLessonReply({
      userId,
      lessonId,
      questionId,
      body: body.body ?? "",
    });
    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message, code: "RATE_LIMITED" }, { status: 429 });
    }
    return jsonError(error);
  }
}
