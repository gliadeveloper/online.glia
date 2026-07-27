import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { adminUpdateCoachingSession, sessionInclude } from "@/lib/coaching-admin";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

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
      action?: "cancel" | "complete" | "reschedule" | "set_meeting";
      cancelReason?: string;
      scheduledAt?: string;
      meetingUrl?: string;
      meetingProvider?: string;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (!body.action) {
      throw new ApiError("action is required", 400, "VALIDATION_ERROR");
    }

    const session = await adminUpdateCoachingSession({
      actorId: userId,
      sessionId: id,
      action: body.action,
      cancelReason: body.cancelReason,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      meetingUrl: body.meetingUrl,
      meetingProvider: body.meetingProvider,
    });

    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error);
  }
}
