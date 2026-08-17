import { NextResponse } from "next/server";

import { jsonError, resolveUserId } from "@/lib/api";
import { grantCheckInAccess, listCheckInAccesses, searchCoachesForCheckInAccess } from "@/lib/checkin-access";

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request);
    const query = new URL(request.url).searchParams.get("q") ?? "";
    const [activeCoaches, results] = await Promise.all([
      listCheckInAccesses(userId),
      searchCoachesForCheckInAccess({ userId, query }),
    ]);
    return NextResponse.json({ activeCoaches, results });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await resolveUserId(request);
    const body = (await request.json()) as { coachUserId?: string };
    if (!body.coachUserId?.trim()) {
      return NextResponse.json({ error: "코치 ID를 입력해 주세요." }, { status: 400 });
    }
    const coach = await grantCheckInAccess({ userId, coachPublicUserId: body.coachUserId });
    return NextResponse.json({ coach }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
