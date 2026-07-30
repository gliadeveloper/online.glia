import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { adminGrantCoachingEntitlementWithSessions } from "@/lib/coaching-admin";
import { assertCoachOwnsOffering, listCoachEntitlements } from "@/lib/coach-offerings";

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const entitlements = await listCoachEntitlements(userId);
    return NextResponse.json(entitlements);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      coachingOfferingId?: string;
      totalSessions?: number;
      validDays?: number;
    };

    const coachId = await resolveUserId(request);
    await assertCoach(coachId);

    if (!body.userId || !body.coachingOfferingId) {
      throw new ApiError("userId and coachingOfferingId are required", 400, "VALIDATION_ERROR");
    }

    await assertCoachOwnsOffering(coachId, body.coachingOfferingId);

    const entitlement = await adminGrantCoachingEntitlementWithSessions({
      actorId: coachId,
      userId: body.userId,
      coachingOfferingId: body.coachingOfferingId,
      totalSessions: body.totalSessions,
      validDays: body.validDays,
    });

    return NextResponse.json(entitlement, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
