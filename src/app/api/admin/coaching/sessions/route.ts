import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { sessionInclude } from "@/lib/coaching-admin";
import type { CoachingSessionPublicationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const publicationStatus = url.searchParams.get(
      "publicationStatus",
    ) as CoachingSessionPublicationStatus | null;
    const entitlementId = url.searchParams.get("entitlementId");

    const sessions = await prisma.coachingSession.findMany({
      where: {
        ...(publicationStatus ? { publicationStatus } : {}),
        ...(entitlementId ? { entitlementId } : {}),
      },
      orderBy: [{ scheduledAt: "asc" }, { sessionNo: "asc" }],
      include: sessionInclude,
    });

    return NextResponse.json(sessions);
  } catch (error) {
    return jsonError(error);
  }
}
