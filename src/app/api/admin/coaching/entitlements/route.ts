import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { adminGrantCoachingEntitlement } from "@/lib/fulfillment";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const status = url.searchParams.get("status");

    const entitlements = await prisma.coachingEntitlement.findMany({
      where: status ? { status: status as "ACTIVE" | "REVOKED" | "SUSPENDED" | "EXHAUSTED" | "EXPIRED" } : undefined,
      orderBy: { createdAt: "desc" },
      take: Number(url.searchParams.get("limit") ?? 100),
      include: {
        user: { select: { id: true, name: true, email: true } },
        coachingOffering: {
          select: { id: true, title: true, slug: true, coach: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { sessions: true } },
      },
    });

    return NextResponse.json(entitlements);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      targetUserId?: string;
      coachingOfferingId?: string;
      totalSessions?: number;
      validDays?: number;
    };

    const actorId = await resolveUserId(request, body);
    await assertAdmin(actorId);

    if (!body.targetUserId || !body.coachingOfferingId) {
      throw new ApiError("targetUserId and coachingOfferingId are required", 400, "VALIDATION_ERROR");
    }

    const entitlement = await adminGrantCoachingEntitlement({
      actorId,
      userId: body.targetUserId,
      coachingOfferingId: body.coachingOfferingId,
      totalSessions: body.totalSessions,
      validDays: body.validDays,
    });

    return NextResponse.json(entitlement, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
