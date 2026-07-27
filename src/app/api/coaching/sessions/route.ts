import { NextResponse } from "next/server";

import type { Prisma } from "@/generated/prisma/client";

import { ApiError, jsonError, resolveUserId } from "@/lib/api";
import { bookCoachingSession } from "@/lib/coaching";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });

    const sessions = await prisma.coachingSession.findMany({
      where: { userId },
      orderBy: { scheduledAt: "desc" },
      include: {
        coach: { select: { id: true, name: true, email: true } },
        entitlement: {
          select: {
            id: true,
            totalSessions: true,
            usedSessions: true,
            reservedSessions: true,
            validUntil: true,
            status: true,
            coachingOffering: { select: { title: true, slug: true } },
          },
        },
        intake: true,
        feedback: true,
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      entitlementId?: string;
      scheduledAt?: string;
      meetingUrl?: string;
      meetingProvider?: string;
      answers?: Prisma.InputJsonValue;
    };

    const userId = await resolveUserId(request, body);

    if (!body.entitlementId?.trim()) {
      throw new ApiError("entitlementId is required", 400, "ENTITLEMENT_ID_REQUIRED");
    }

    if (!body.scheduledAt?.trim()) {
      throw new ApiError("scheduledAt is required", 400, "SCHEDULED_AT_REQUIRED");
    }

    const scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new ApiError("scheduledAt is invalid", 400, "INVALID_SCHEDULED_AT");
    }

    const session = await bookCoachingSession({
      userId,
      entitlementId: body.entitlementId.trim(),
      scheduledAt,
      meetingUrl: body.meetingUrl?.trim(),
      meetingProvider: body.meetingProvider?.trim(),
      answers: body.answers,
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
