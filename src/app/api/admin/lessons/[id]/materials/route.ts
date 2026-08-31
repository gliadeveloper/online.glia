import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { createLessonMaterial, readLessonMaterialUpload } from "@/lib/lesson-materials";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const userId = await resolveUserId(request);
    await assertAdmin(userId);

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
