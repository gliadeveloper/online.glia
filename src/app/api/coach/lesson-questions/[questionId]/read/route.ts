import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { markOwnedLessonQuestionRead } from "@/lib/lesson-qna";
import { getSessionUserId } from "@/lib/session";

type RouteContext = { params: Promise<{ questionId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { questionId } = await context.params;
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED");
    }
    await markOwnedLessonQuestionRead(userId, questionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
