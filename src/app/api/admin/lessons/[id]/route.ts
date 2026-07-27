import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { deleteLesson, updateLesson } from "@/lib/curriculum-admin";
import type { LessonType } from "@/generated/prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      title?: string;
      description?: string;
      type?: LessonType;
      duration?: number;
      isFree?: boolean;
    };

    const userId = await resolveUserId(request, body);
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

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    await deleteLesson({ actorId: userId, lessonId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
