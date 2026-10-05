import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { createLessonQuestion, listLessonQuestions } from "@/lib/lesson-qna";
import { assertRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

type RouteContext = { params: Promise<{ lessonId: string }> };

async function requireUserId() {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED");
  }
  return userId;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { lessonId } = await context.params;
    const userId = await requireUserId();
    const questions = await listLessonQuestions(userId, lessonId);
    return NextResponse.json({ questions });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { lessonId } = await context.params;
    const userId = await requireUserId();
    assertRateLimit(`lesson-qna:${userId}`, 12, 60_000);
    const body = (await request.json()) as { title?: string; body?: string };
    const question = await createLessonQuestion({
      userId,
      lessonId,
      title: body.title ?? "",
      body: body.body ?? "",
    });
    return NextResponse.json({ question });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message, code: "RATE_LIMITED" }, { status: 429 });
    }
    return jsonError(error);
  }
}
