import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { deleteModule, updateModule } from "@/lib/curriculum-admin";

type RouteContext = { params: Promise<{ id: string; moduleId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { moduleId } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      title?: string;
      description?: string;
      order?: number;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    const module = await updateModule({
      actorId: userId,
      moduleId,
      title: body.title,
      description: body.description,
      order: body.order,
    });

    return NextResponse.json(module);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { moduleId } = await context.params;
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    await deleteModule({ actorId: userId, moduleId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
