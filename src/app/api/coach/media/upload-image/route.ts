import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, requireSessionUserId } from "@/lib/api";
import { assertCoachOwnsLesson } from "@/lib/coach-courses";
import { parseLessonImageUploadForm } from "@/lib/media/lesson-image-upload-route";
import { uploadLessonImageBuffer } from "@/lib/media/r2-image-upload";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    await assertCoach(userId);

    const payload = await parseLessonImageUploadForm(request);
    const lesson = await assertCoachOwnsLesson(userId, payload.lessonId);
    if (lesson.module.courseId !== payload.courseId) throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");

    const uploaded = await uploadLessonImageBuffer(payload);
    return NextResponse.json(uploaded);
  } catch (error) {
    return jsonError(error);
  }
}
