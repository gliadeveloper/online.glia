import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { toggleQuestionUpvote } from "@/lib/lesson-qna";
import { getSessionUserId } from "@/lib/session";

type RouteContext = { params: Promise<{ lessonId: string; questionId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { lessonId, questionId } = await context.params;
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED");
    }
    const question = await toggleQuestionUpvote({ userId, lessonId, questionId });
    return NextResponse.json({ question });
  } catch (error) {
    return jsonError(error);
  }
}
