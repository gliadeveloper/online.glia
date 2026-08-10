import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { assertCoachOwnsLesson } from "@/lib/coach-courses";
import { createLessonImageUpload } from "@/lib/media/r2-image-upload";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      courseId?: string;
      lessonId?: string;
      fileName?: string;
      contentType?: string;
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);

    if (!body.courseId || !body.lessonId || !body.fileName?.trim() || !body.contentType?.trim()) {
      throw new ApiError(
        "courseId, lessonId, fileName, contentType are required",
        400,
        "VALIDATION_ERROR",
      );
    }

    await assertCoachOwnsLesson(userId, body.lessonId);

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
