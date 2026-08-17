import { NextResponse } from "next/server";

import { jsonError, resolveUserId } from "@/lib/api";
import { updateLessonProgress } from "@/lib/learning";
import type { ProgressStatus } from "@/generated/prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      courseId?: string;
      status?: ProgressStatus;
    };

    const userId = await resolveUserId(request, body);

    if (!body.courseId?.trim()) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    if (!body.status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const result = await updateLessonProgress({
      userId,
      courseId: body.courseId,
      lessonId,
      status: body.status,
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
