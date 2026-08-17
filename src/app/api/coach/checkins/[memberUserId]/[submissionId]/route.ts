import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { getCoachCheckInSubmission } from "@/lib/coach-checkins";

type RouteContext = { params: Promise<{ memberUserId: string; submissionId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const coachId = await resolveUserId(request);
    await assertCoach(coachId);
    const { memberUserId, submissionId } = await params;
    return NextResponse.json(await getCoachCheckInSubmission({ coachId, memberPublicUserId: memberUserId, submissionId }));
  } catch (error) {
    return jsonError(error);
  }
}
