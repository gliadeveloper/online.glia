import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { createLessonImageUpload } from "@/lib/media/r2-image-upload";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      courseId?: string;
      lessonId?: string;
      fileName?: string;
      contentType?: string;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (!body.courseId || !body.lessonId || !body.fileName?.trim() || !body.contentType?.trim()) {
      throw new ApiError(
        "courseId, lessonId, fileName, contentType are required",
        400,
        "VALIDATION_ERROR",
      );
    }

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: body.lessonId,
        module: { courseId: body.courseId },
      },
      select: { id: true },
    });

    if (!lesson) {
      throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
    }

    const presigned = await createLessonImageUpload({
      courseId: body.courseId,
      lessonId: body.lessonId,
      fileName: body.fileName,
      contentType: body.contentType,
    });

    return NextResponse.json(presigned);
  } catch (error) {
    return jsonError(error);
  }
}
