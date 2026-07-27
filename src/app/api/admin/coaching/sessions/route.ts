import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { sessionInclude } from "@/lib/coaching-admin";
import type { CoachingSessionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const status = url.searchParams.get("status") as CoachingSessionStatus | null;
    const coachId = url.searchParams.get("coachId");
    const limit = Number(url.searchParams.get("limit") ?? 50);

    const sessions = await prisma.coachingSession.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(coachId ? { coachId } : {}),
      },
      orderBy: { scheduledAt: "desc" },
      take: limit,
      include: sessionInclude,
    });

    return NextResponse.json(sessions);
  } catch (error) {
    return jsonError(error);
  }
}
