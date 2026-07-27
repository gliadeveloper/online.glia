import { NextResponse } from "next/server";

import { jsonError, resolveUserId } from "@/lib/api";
import { getRemainingSessions } from "@/lib/coaching";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });

    const entitlements = await prisma.coachingEntitlement.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        coachingOffering: {
          select: {
            id: true,
            slug: true,
            title: true,
            deliveryMode: true,
            sessionMinutes: true,
          },
        },
        course: { select: { id: true, slug: true, title: true } },
        enrollment: { select: { id: true, status: true } },
        sessions: {
          orderBy: { scheduledAt: "asc" },
          select: {
            id: true,
            sessionNo: true,
            status: true,
            scheduledAt: true,
            completedAt: true,
          },
        },
      },
    });

    return NextResponse.json(
      entitlements.map((entitlement) => ({
        ...entitlement,
        remainingSessions: getRemainingSessions(entitlement),
      })),
    );
  } catch (error) {
    return jsonError(error);
  }
}
