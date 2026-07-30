import { NextResponse } from "next/server";

import { jsonError, resolveUserId } from "@/lib/api";
import { sessionListInclude } from "@/lib/coaching";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });

    const entitlementId = url.searchParams.get("entitlementId");

    const sessions = await prisma.coachingSession.findMany({
      where: {
        userId,
        ...(entitlementId ? { entitlementId } : {}),
      },
      orderBy: [{ entitlementId: "desc" }, { sessionNo: "asc" }],
      include: sessionListInclude,
    });

    return NextResponse.json(sessions);
  } catch (error) {
    return jsonError(error);
  }
}
