import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { listCoachCheckInSubmissions, type CoachCheckInKind } from "@/lib/coach-checkins";

type RouteContext = { params: Promise<{ memberUserId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const coachId = await resolveUserId(request);
    await assertCoach(coachId);
    const { memberUserId } = await params;
    const kind = new URL(request.url).searchParams.get("kind");
    if (kind !== "daily" && kind !== "weekly") {
      return NextResponse.json({ error: "kind는 daily 또는 weekly여야 합니다." }, { status: 400 });
    }
    return NextResponse.json(await listCoachCheckInSubmissions({ coachId, memberPublicUserId: memberUserId, kind: kind as CoachCheckInKind }));
  } catch (error) {
    return jsonError(error);
  }
}
