import { NextResponse } from "next/server";

import type { Prisma } from "@/generated/prisma/client";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { adminUpdateCoachingSession } from "@/lib/coaching-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const { sessionInclude } = await import("@/lib/coaching-admin");
    const { prisma } = await import("@/lib/prisma");

    const session = await prisma.coachingSession.findUnique({
      where: { id },
      include: sessionInclude,
    });

    if (!session) {
      throw new ApiError("Coaching session not found", 404, "SESSION_NOT_FOUND");
    }

    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      title?: string;
      summary?: string | null;
      scheduledAt?: string;
      bodyMarkdown?: string | null;
      bodyMetadata?: Prisma.InputJsonValue | null;
      publicationStatus?: "DRAFT" | "PUBLISHED" | "EMPTY";
      progressStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    const session = await adminUpdateCoachingSession({
      actorId: userId,
      sessionId: id,
      title: body.title,
      summary: body.summary,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      bodyMarkdown: body.bodyMarkdown,
      bodyMetadata: body.bodyMetadata,
      publicationStatus: body.publicationStatus,
      progressStatus: body.progressStatus,
    });

    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error);
  }
}
