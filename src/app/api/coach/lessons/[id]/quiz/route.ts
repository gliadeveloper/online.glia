import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { upsertQuiz } from "@/lib/assessment-admin";
import { assertCoachOwnsLesson } from "@/lib/coach-courses";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      passingScore?: number;
      timeLimitMinutes?: number | null;
      questions?: Array<{
        prompt: string;
        order: number;
        options: Array<{ label: string; order: number; isCorrect?: boolean }>;
      }>;
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);
    await assertCoachOwnsLesson(userId, lessonId);

    if (!body.title?.trim()) {
      throw new ApiError("title is required", 400, "VALIDATION_ERROR");
    }

    const quiz = await upsertQuiz({
      actorId: userId,
      lessonId,
      title: body.title,
      description: body.description,
      passingScore: body.passingScore,
      timeLimitMinutes: body.timeLimitMinutes,
      questions: body.questions,
    });

    return NextResponse.json(quiz);
  } catch (error) {
    return jsonError(error);
  }
}
