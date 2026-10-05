import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { deleteLessonReply, updateLessonReply } from "@/lib/lesson-qna";
import { getSessionUserId } from "@/lib/session";

type RouteContext = { params: Promise<{ lessonId: string; questionId: string; replyId: string }> };

async function requireUserId() {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED");
  }
  return userId;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { lessonId, questionId, replyId } = await context.params;
    const userId = await requireUserId();
    const body = (await request.json()) as { body?: string };
    const reply = await updateLessonReply({
      userId,
      lessonId,
      questionId,
      replyId,
      body: body.body ?? "",
    });
    return NextResponse.json({ reply });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { lessonId, questionId, replyId } = await context.params;
    const userId = await requireUserId();
    await deleteLessonReply({ userId, lessonId, questionId, replyId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
