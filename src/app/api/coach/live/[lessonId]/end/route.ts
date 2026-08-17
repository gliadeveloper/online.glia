import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { endLiveSession } from "@/lib/live-sessions";

type RouteContext = { params: Promise<{ lessonId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const coachId = await resolveUserId(request);
    await assertCoach(coachId);
    const { lessonId } = await params;
    return NextResponse.json(await endLiveSession({ coachId, lessonId }));
  } catch (error) {
    return jsonError(error);
  }
}
