import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { assertCoachOwnsModule } from "@/lib/coach-courses";
import { createLesson } from "@/lib/curriculum-admin";
import type { LessonType } from "@/generated/prisma/client";

type RouteContext = { params: Promise<{ moduleId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { moduleId } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      type?: LessonType;
      duration?: number;
      isFree?: boolean;
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);
    await assertCoachOwnsModule(userId, moduleId);

    if (!body.title?.trim()) {
      throw new ApiError("title is required", 400, "VALIDATION_ERROR");
    }

    const lesson = await createLesson({
      actorId: userId,
      moduleId,
      title: body.title,
      description: body.description,
      type: body.type,
      duration: body.duration,
      isFree: body.isFree,
    });

    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
