import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { getLessonDetail } from "@/lib/assessment-admin";
import { assertCoachOwnsLesson } from "@/lib/coach-courses";
import { deleteLesson, updateLesson } from "@/lib/curriculum-admin";
import type { LessonType } from "@/generated/prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(request);
    await assertCoach(userId);
    await assertCoachOwnsLesson(userId, id);

    const lesson = await getLessonDetail(id);
    return NextResponse.json(lesson);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      type?: LessonType;
      duration?: number;
      isFree?: boolean;
      order?: number;
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);
    await assertCoachOwnsLesson(userId, id);

    const lesson = await updateLesson({
      actorId: userId,
      lessonId: id,
      title: body.title,
      description: body.description,
      type: body.type,
      duration: body.duration,
      isFree: body.isFree,
      order: body.order,
    });

    return NextResponse.json(lesson);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(request);
    await assertCoach(userId);
    await assertCoachOwnsLesson(userId, id);

    await deleteLesson({ actorId: userId, lessonId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
