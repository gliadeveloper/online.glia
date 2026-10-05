import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { deleteLessonQuestion, updateLessonQuestion } from "@/lib/lesson-qna";
import { getSessionUserId } from "@/lib/session";

type RouteContext = { params: Promise<{ lessonId: string; questionId: string }> };

async function requireUserId() {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED");
  }
  return userId;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { lessonId, questionId } = await context.params;
    const userId = await requireUserId();
    const body = (await request.json()) as { title?: string; body?: string; isClosed?: boolean };
    const question = await updateLessonQuestion({
      userId,
      lessonId,
      questionId,
      title: body.title,
      body: body.body,
      isClosed: body.isClosed,
    });
    return NextResponse.json({ question });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { lessonId, questionId } = await context.params;
    const userId = await requireUserId();
    await deleteLessonQuestion({ userId, lessonId, questionId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
