import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { getCoachCustomerDetail } from "@/lib/coach-customers";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId: customerUserId } = await context.params;
    const coachId = await resolveUserId(request);
    await assertCoach(coachId);

    const detail = await getCoachCustomerDetail(coachId, customerUserId);
    return NextResponse.json(detail);
  } catch (error) {
    return jsonError(error);
  }
}
