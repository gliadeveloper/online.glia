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
      courseSlug?: string;
      status?: ProgressStatus;
    };

    const userId = await resolveUserId(request, body);

    if (!body.courseSlug?.trim()) {
      return NextResponse.json({ error: "courseSlug is required" }, { status: 400 });
    }

    if (!body.status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const result = await updateLessonProgress({
      userId,
      courseSlug: body.courseSlug,
      lessonId,
      status: body.status,
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
