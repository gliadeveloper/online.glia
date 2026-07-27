import { NextResponse } from "next/server";

import { jsonError, resolveUserId } from "@/lib/api";
import { getTodayCheckInStatus } from "@/lib/forms";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });

    const checkIns = await getTodayCheckInStatus(userId);

    return NextResponse.json({
      date: checkIns[0]?.checkInDate ?? null,
      checkIns,
    });
  } catch (error) {
    return jsonError(error);
  }
}
