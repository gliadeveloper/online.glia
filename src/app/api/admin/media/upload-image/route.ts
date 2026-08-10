import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { parseLessonImageUploadForm } from "@/lib/media/lesson-image-upload-route";
import { uploadLessonImageBuffer } from "@/lib/media/r2-image-upload";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const userId = await resolveUserId(request);
    await assertAdmin(userId);

    const payload = await parseLessonImageUploadForm(request);

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: payload.lessonId,
        module: { courseId: payload.courseId },
      },
      select: { id: true },
    });

    if (!lesson) {
      throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
    }

    const uploaded = await uploadLessonImageBuffer(payload);
    return NextResponse.json(uploaded);
  } catch (error) {
    return jsonError(error);
  }
}
