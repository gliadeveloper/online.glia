import { NextResponse } from "next/server";

import { assertAdmin, jsonError, requireSessionUserId } from "@/lib/api";
import { deleteContent, updateContent } from "@/lib/curriculum-admin";
import type { ContentType } from "@/generated/prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: contentId } = await context.params;
    const body = (await request.json()) as {
      expectedBodyVersion?: string;
      title?: string;
      url?: string;
      body?: string;
      type?: ContentType;
      metadata?: import("@/generated/prisma/client").Prisma.InputJsonValue | null;
    };

    const userId = await requireSessionUserId();
    await assertAdmin(userId);

    const content = await updateContent({
      actorId: userId,
      contentId,
      title: body.title,
      url: body.url,
      body: body.body,
      type: body.type,
      metadata: body.metadata,
      expectedBodyVersion: body.expectedBodyVersion,
    });

    return NextResponse.json(content);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id: contentId } = await context.params;
    const userId = await requireSessionUserId();
    await assertAdmin(userId);

    await deleteContent({ actorId: userId, contentId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
