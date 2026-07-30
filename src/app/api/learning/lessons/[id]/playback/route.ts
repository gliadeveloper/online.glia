import { NextResponse } from "next/server";

import { ApiError, jsonError, resolveUserId } from "@/lib/api";
import { getEnrollmentForCourse } from "@/lib/learning";
import { isR2VideoMetadata, parseContentMetadata } from "@/lib/media/content-metadata";
import { createR2PlaybackUrl } from "@/lib/media/r2";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const url = new URL(request.url);
    const contentId = url.searchParams.get("contentId");
    const courseSlug = url.searchParams.get("courseSlug");

    if (!contentId || !courseSlug) {
      throw new ApiError("contentId and courseSlug are required", 400, "VALIDATION_ERROR");
    }

    const userId = await resolveUserId(request);
    const enrollment = await getEnrollmentForCourse(userId, courseSlug);
    if (!enrollment) {
      throw new ApiError("Enrollment not found", 404, "ENROLLMENT_NOT_FOUND");
    }

    const content = await prisma.content.findFirst({
      where: {
        id: contentId,
        lessonId,
        lesson: { module: { courseId: enrollment.courseId } },
      },
    });

    if (!content) {
      throw new ApiError("Content not found", 404, "CONTENT_NOT_FOUND");
    }

    const metadata = parseContentMetadata(content.metadata);
    if (isR2VideoMetadata(metadata)) {
      const playbackUrl = await createR2PlaybackUrl(metadata.objectKey);
      return NextResponse.json({ playbackUrl, source: "r2" as const });
    }

    if (content.url?.trim()) {
      return NextResponse.json({ playbackUrl: content.url, source: "url" as const });
    }

    throw new ApiError("No playable media found", 404, "PLAYBACK_NOT_FOUND");
  } catch (error) {
    return jsonError(error);
  }
}
