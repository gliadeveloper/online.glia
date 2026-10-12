import { NextResponse } from "next/server";

import { assertAdmin, jsonError, requireSessionUserId } from "@/lib/api";
import { deleteModule, updateModule } from "@/lib/curriculum-admin";

type RouteContext = { params: Promise<{ id: string; moduleId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { moduleId } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      order?: number;
    };

    const userId = await requireSessionUserId();
    await assertAdmin(userId);

    const courseModule = await updateModule({
      actorId: userId,
      moduleId,
      title: body.title,
      description: body.description,
      order: body.order,
    });

    return NextResponse.json(courseModule);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { moduleId } = await context.params;
    const userId = await requireSessionUserId();
    await assertAdmin(userId);

    await deleteModule({ actorId: userId, moduleId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
