import { NextResponse } from "next/server";

import { jsonError, resolveUserId } from "@/lib/api";
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
            totalSessions: true,
          },
        },
        course: { select: { id: true, slug: true, title: true } },
        enrollment: { select: { id: true, status: true } },
        sessions: {
          orderBy: { sessionNo: "asc" },
          select: {
            id: true,
            sessionNo: true,
            title: true,
            publicationStatus: true,
            scheduledAt: true,
            progressStatus: true,
            completedAt: true,
          },
        },
      },
    });

    return NextResponse.json(entitlements);
  } catch (error) {
    return jsonError(error);
  }
}
