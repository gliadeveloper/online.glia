import { NextResponse } from "next/server";

import { assertCoach, jsonError, requireSessionUserId } from "@/lib/api";
import { assertCoachOwnsContent } from "@/lib/coach-courses";
import { deleteContent, updateContent } from "@/lib/curriculum-admin";
import type { ContentType, Prisma } from "@/generated/prisma/client";

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
      metadata?: Prisma.InputJsonValue | null;
    };

    const userId = await requireSessionUserId();
    await assertCoach(userId);
    await assertCoachOwnsContent(userId, contentId);

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
    await assertCoach(userId);
    await assertCoachOwnsContent(userId, contentId);

    await deleteContent({ actorId: userId, contentId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
