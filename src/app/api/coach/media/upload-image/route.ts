import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { assertCoachOwnsLesson } from "@/lib/coach-courses";
import { parseLessonImageUploadForm } from "@/lib/media/lesson-image-upload-route";
import { uploadLessonImageBuffer } from "@/lib/media/r2-image-upload";

export async function POST(request: Request) {
  try {
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const payload = await parseLessonImageUploadForm(request);
    await assertCoachOwnsLesson(userId, payload.lessonId);

    const uploaded = await uploadLessonImageBuffer(payload);
    return NextResponse.json(uploaded);
  } catch (error) {
    return jsonError(error);
  }
}
