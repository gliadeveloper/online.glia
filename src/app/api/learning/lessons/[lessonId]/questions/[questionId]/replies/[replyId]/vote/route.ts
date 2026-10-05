import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { toggleReplyUpvote } from "@/lib/lesson-qna";
import { getSessionUserId } from "@/lib/session";

type RouteContext = { params: Promise<{ lessonId: string; questionId: string; replyId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { lessonId, questionId, replyId } = await context.params;
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED");
    }
    const question = await toggleReplyUpvote({ userId, lessonId, questionId, replyId });
    return NextResponse.json({ question });
  } catch (error) {
    return jsonError(error);
  }
}
