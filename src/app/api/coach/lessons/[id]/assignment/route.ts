import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { upsertAssignment } from "@/lib/assessment-admin";
import { assertCoachOwnsLesson } from "@/lib/coach-courses";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      maxScore?: number;
      dueDate?: string | null;
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);
    await assertCoachOwnsLesson(userId, lessonId);

    if (!body.title?.trim()) {
      throw new ApiError("title is required", 400, "VALIDATION_ERROR");
    }

    const assignment = await upsertAssignment({
      actorId: userId,
      lessonId,
      title: body.title,
      description: body.description,
      maxScore: body.maxScore,
      dueDate: body.dueDate ? new Date(body.dueDate) : body.dueDate === null ? null : undefined,
    });

    return NextResponse.json(assignment);
  } catch (error) {
    return jsonError(error);
  }
}
