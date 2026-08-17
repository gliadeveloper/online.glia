import { NextResponse } from "next/server";

import { jsonError, resolveUserId } from "@/lib/api";
import { submitQuizAttempt } from "@/lib/assessment-customer";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: quizId } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      courseId?: string;
      answers?: Array<{ questionId: string; optionId: string }>;
    };

    const userId = await resolveUserId(request, body);

    if (!body.courseId?.trim()) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    if (!body.answers?.length) {
      return NextResponse.json({ error: "answers are required" }, { status: 400 });
    }

    const result = await submitQuizAttempt({
      userId,
      courseId: body.courseId,
      quizId,
      answers: body.answers,
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
