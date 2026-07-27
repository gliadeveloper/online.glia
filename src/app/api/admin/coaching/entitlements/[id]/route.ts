import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { updateCoachingEntitlementAdmin } from "@/lib/enrollments-admin";
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

    const entitlement = await prisma.coachingEntitlement.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        coachingOffering: {
          select: { id: true, title: true, slug: true, coach: { select: { id: true, name: true, email: true } } },
        },
        sessions: { orderBy: { scheduledAt: "desc" } },
      },
    });

    if (!entitlement) {
      throw new ApiError("Entitlement not found", 404, "NOT_FOUND");
    }

    return NextResponse.json(entitlement);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      status?: "ACTIVE" | "SUSPENDED" | "REVOKED";
      totalSessions?: number;
      extendDays?: number;
    };

    const actorId = await resolveUserId(request, body);
    await assertAdmin(actorId);

    const entitlement = await updateCoachingEntitlementAdmin({
      actorId,
      entitlementId: id,
      status: body.status,
      totalSessions: body.totalSessions,
      extendDays: body.extendDays,
    });

    return NextResponse.json(entitlement);
  } catch (error) {
    return jsonError(error);
  }
}
