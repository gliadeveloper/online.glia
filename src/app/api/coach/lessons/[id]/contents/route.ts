import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { assertCoachOwnsLesson } from "@/lib/coach-courses";
import { createContent } from "@/lib/curriculum-admin";
import type { ContentType, Prisma } from "@/generated/prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const body = (await request.json()) as {
      type?: ContentType;
      title?: string;
      url?: string;
      body?: string;
      metadata?: Prisma.InputJsonValue;
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);
    await assertCoachOwnsLesson(userId, lessonId);

    if (!body.type) {
      throw new ApiError("type is required", 400, "VALIDATION_ERROR");
    }

    const content = await createContent({
      actorId: userId,
      lessonId,
      type: body.type,
      title: body.title,
      url: body.url,
      body: body.body,
      metadata: body.metadata,
    });

    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
