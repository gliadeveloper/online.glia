import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { parseCoachScheduledAt } from "@/lib/coach-coaching-board";
import { coachUpdateEntitlementSchedules, getCoachEntitlementBoard } from "@/lib/coaching-coach";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const entitlement = await getCoachEntitlementBoard(id, userId);
    return NextResponse.json(entitlement);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      sessions?: Array<{ id?: string; scheduledAt?: string }>;
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);

    if (!body.sessions?.length) {
      throw new ApiError("sessions is required", 400, "VALIDATION_ERROR");
    }

    const sessions = body.sessions.map((row) => {
      if (!row.id || !row.scheduledAt) {
        throw new ApiError("id and scheduledAt are required", 400, "VALIDATION_ERROR");
      }
      const scheduledAt = parseCoachScheduledAt(row.scheduledAt);
      if (!scheduledAt) {
        throw new ApiError("발행일이 올바르지 않습니다.", 400, "VALIDATION_ERROR");
      }
      return { id: row.id, scheduledAt };
    });

    const entitlement = await coachUpdateEntitlementSchedules({
      coachId: userId,
      entitlementId: id,
      sessions,
    });

    return NextResponse.json(entitlement);
  } catch (error) {
    return jsonError(error);
  }
}
