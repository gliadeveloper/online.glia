import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { getLessonDetail, upsertQuiz } from "@/lib/assessment-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const lesson = await getLessonDetail(lessonId);
    return NextResponse.json(lesson.quiz);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
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

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
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
