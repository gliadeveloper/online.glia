import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { deleteLessonMaterial } from "@/lib/lesson-materials";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id: materialId } = await context.params;
    const userId = await resolveUserId(request);
    await assertAdmin(userId);
    await deleteLessonMaterial({ actorId: userId, materialId });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
