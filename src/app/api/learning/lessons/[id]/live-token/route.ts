import { NextResponse } from "next/server";

import { ApiError, jsonError, resolveUserId } from "@/lib/api";
import { getEnrollmentForCourse } from "@/lib/learning";
import { buildLiveSessionView, getLiveContentMetadataFromLesson } from "@/lib/live-session";
import { isLiveKitMetadata, parseContentMetadata } from "@/lib/media/content-metadata";
import { createLiveKitToken, resolveLessonLiveRoomName } from "@/lib/media/livekit";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const body = (await request.json()) as { courseSlug?: string };

    if (!body.courseSlug?.trim()) {
      throw new ApiError("courseSlug is required", 400, "VALIDATION_ERROR");
    }

    const userId = await resolveUserId(request);
    const enrollment = await getEnrollmentForCourse(userId, body.courseSlug);
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
    const session = buildLiveSessionView(metadata);

    if (!session.configured) {
      throw new ApiError("Live session is not configured", 400, "LIVE_NOT_CONFIGURED");
    }

    if (!session.canJoin) {
      throw new ApiError("Live session has not started yet", 403, "LIVE_NOT_STARTED");
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const roomName = resolveLessonLiveRoomName(
      lessonId,
      isLiveKitMetadata(metadata) ? metadata.roomName : null,
    );

    const liveToken = await createLiveKitToken({
      roomName,
      identity: userId,
      name: user.name ?? user.email,
      canPublish: false,
    });

    return NextResponse.json(liveToken);
  } catch (error) {
    return jsonError(error);
  }
}
