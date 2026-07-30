import { NextResponse } from "next/server";

import { ApiError, jsonError, resolveUserId } from "@/lib/api";
import { getEnrollmentForCourse } from "@/lib/learning";
import { buildLiveSessionView, getLiveContentMetadataFromLesson } from "@/lib/live-session";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const url = new URL(request.url);
    const courseSlug = url.searchParams.get("courseSlug");

    if (!courseSlug?.trim()) {
      throw new ApiError("courseSlug is required", 400, "VALIDATION_ERROR");
    }

    const userId = await resolveUserId(request);
    const enrollment = await getEnrollmentForCourse(userId, courseSlug);
    if (!enrollment) {
      throw new ApiError("Enrollment not found", 404, "ENROLLMENT_NOT_FOUND");
    }

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        type: "LIVE",
        module: { courseId: enrollment.courseId },
      },
      include: {
        contents: { orderBy: { order: "asc" } },
      },
    });

    if (!lesson) {
      throw new ApiError("Live lesson not found", 404, "LESSON_NOT_FOUND");
    }

    const metadata = getLiveContentMetadataFromLesson(lesson.contents);
    return NextResponse.json(buildLiveSessionView(metadata));
  } catch (error) {
    return jsonError(error);
  }
}
