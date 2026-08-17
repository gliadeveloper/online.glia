import { NextResponse } from "next/server";

import { jsonError, resolveUserId } from "@/lib/api";
import { revokeCheckInAccess } from "@/lib/checkin-access";

type RouteContext = { params: Promise<{ userId: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const userId = await resolveUserId(request);
    const { userId: coachUserId } = await context.params;
    await revokeCheckInAccess({ userId, coachPublicUserId: decodeURIComponent(coachUserId) });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}
