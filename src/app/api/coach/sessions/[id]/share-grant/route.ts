import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import {
  cancelShareGrant,
  createOrRefreshShareGrant,
  getCoachSessionShareGrant,
} from "@/lib/checkin-share/grants";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(_request);
    await assertCoach(userId);

    const grant = await getCoachSessionShareGrant(id, userId);
    return NextResponse.json(grant);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      scopeType: "WEEK" | "RANGE";
      weekPeriodKey?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      coachMessage?: string | null;
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const grant = await createOrRefreshShareGrant({
      coachId: userId,
      sessionId: id,
      scopeType: body.scopeType,
      weekPeriodKey: body.weekPeriodKey,
      startDate: body.startDate,
      endDate: body.endDate,
      coachMessage: body.coachMessage,
    });

    return NextResponse.json(grant);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(_request);
    await assertCoach(userId);

    const grant = await cancelShareGrant({ coachId: userId, sessionId: id });
    return NextResponse.json(grant);
  } catch (error) {
    return jsonError(error);
  }
}
