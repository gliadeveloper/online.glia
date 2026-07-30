import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { getShareReportForCoach } from "@/lib/checkin-share/grants";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(_request);
    await assertCoach(userId);

    const report = await getShareReportForCoach(id, userId);
    return NextResponse.json(report);
  } catch (error) {
    return jsonError(error);
  }
}
