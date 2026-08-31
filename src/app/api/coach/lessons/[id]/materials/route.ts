import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { assertCoachOwnsLesson } from "@/lib/coach-courses";
import { createLessonMaterial, readLessonMaterialUpload } from "@/lib/lesson-materials";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const userId = await resolveUserId(request);
    await assertCoach(userId);
    await assertCoachOwnsLesson(userId, lessonId);

    const upload = await readLessonMaterialUpload(request);
    const material = await createLessonMaterial({
      actorId: userId,
      lessonId,
      ...upload,
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
