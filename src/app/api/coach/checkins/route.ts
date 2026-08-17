import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { listCoachCheckInMembers } from "@/lib/coach-checkins";

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request);
    await assertCoach(userId);
    return NextResponse.json(await listCoachCheckInMembers(userId));
  } catch (error) {
    return jsonError(error);
  }
}
