import { NextResponse } from "next/server";

import { assertAdmin, jsonError, requireSessionUserId } from "@/lib/api";
import { deleteLesson, updateLesson } from "@/lib/curriculum-admin";
import type { LessonType } from "@/generated/prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      type?: LessonType;
      duration?: number;
      isFree?: boolean;
    };

    const userId = await requireSessionUserId();
    await assertAdmin(userId);

    const lesson = await updateLesson({
      actorId: userId,
      lessonId,
      title: body.title,
      description: body.description,
      type: body.type,
      duration: body.duration,
      isFree: body.isFree,
    });

    return NextResponse.json(lesson);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const userId = await requireSessionUserId();
    await assertAdmin(userId);

    await deleteLesson({ actorId: userId, lessonId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
