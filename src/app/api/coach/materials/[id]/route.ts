import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { assertCoachOwnsLesson } from "@/lib/coach-courses";
import { deleteLessonMaterial } from "@/lib/lesson-materials";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id: materialId } = await context.params;
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const existing = await prisma.lessonMaterial.findUnique({
      where: { id: materialId },
      select: { lessonId: true },
    });

    if (!existing) {
      throw new ApiError("Material not found", 404, "MATERIAL_NOT_FOUND");
    }

    await assertCoachOwnsLesson(userId, existing.lessonId);
    await deleteLessonMaterial({ actorId: userId, materialId });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
