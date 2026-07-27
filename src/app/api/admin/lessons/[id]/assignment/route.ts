import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { getLessonDetail, upsertAssignment } from "@/lib/assessment-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const lesson = await getLessonDetail(lessonId);
    return NextResponse.json(lesson.assignment);
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
      maxScore?: number;
      dueDate?: string | null;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
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
