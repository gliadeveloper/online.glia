import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { listCoachSessions } from "@/lib/coaching-coach";

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const sessions = await listCoachSessions(userId);
    return NextResponse.json(sessions);
  } catch (error) {
    return jsonError(error);
  }
}
