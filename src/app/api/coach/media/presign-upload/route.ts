import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { assertCoachOwnsLesson } from "@/lib/coach-courses";
import { buildCourseVideoObjectKey } from "@/lib/media/content-metadata";
import { createLiveKitToken } from "@/lib/media/livekit";
import { createR2UploadPresignedUrl } from "@/lib/media/r2";

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
      throw new ApiError("courseId, lessonId, fileName, contentType are required", 400, "VALIDATION_ERROR");
    }

    await assertCoachOwnsLesson(userId, body.lessonId);

    const objectKey = buildCourseVideoObjectKey({
      courseId: body.courseId,
      lessonId: body.lessonId,
      fileName: body.fileName,
    });

    const presigned = await createR2UploadPresignedUrl({
      objectKey,
      contentType: body.contentType,
    });

    return NextResponse.json({
      ...presigned,
      metadata: {
        provider: "r2",
        objectKey,
        mimeType: body.contentType,
        fileName: body.fileName,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
