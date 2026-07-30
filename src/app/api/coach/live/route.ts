import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { listCoachLiveReplays, listCoachLiveSessions } from "@/lib/coach-live";

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const [sessions, replays] = await Promise.all([
      listCoachLiveSessions(userId),
      listCoachLiveReplays(userId),
    ]);
    return NextResponse.json({ sessions, replays });
  } catch (error) {
    return jsonError(error);
  }
}
