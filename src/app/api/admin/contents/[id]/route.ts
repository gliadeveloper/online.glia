import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { deleteContent, updateContent } from "@/lib/curriculum-admin";
import type { ContentType } from "@/generated/prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: contentId } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      title?: string;
      url?: string;
      body?: string;
      type?: ContentType;
      metadata?: import("@/generated/prisma/client").Prisma.InputJsonValue;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    const content = await updateContent({
      actorId: userId,
      contentId,
      title: body.title,
      url: body.url,
      body: body.body,
      type: body.type,
      metadata: body.metadata,
    });

    return NextResponse.json(content);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id: contentId } = await context.params;
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    await deleteContent({ actorId: userId, contentId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
