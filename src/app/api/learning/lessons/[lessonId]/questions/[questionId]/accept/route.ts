import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { acceptLessonReply } from "@/lib/lesson-qna";
import { getSessionUserId } from "@/lib/session";

type RouteContext = { params: Promise<{ lessonId: string; questionId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { lessonId, questionId } = await context.params;
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED");
    }
    const body = (await request.json()) as { replyId?: string };
    if (!body.replyId) {
      throw new ApiError("채택할 답변을 선택해 주세요.", 400, "VALIDATION_ERROR");
    }
    const question = await acceptLessonReply({
      userId,
      lessonId,
      questionId,
      replyId: body.replyId,
    });
    return NextResponse.json({ question });
  } catch (error) {
    return jsonError(error);
  }
}
