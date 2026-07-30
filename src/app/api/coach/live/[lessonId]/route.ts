import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import {
  convertCoachLiveReplay,
  endCoachLiveSession,
  rescheduleCoachLiveSession,
  startCoachLiveSession,
} from "@/lib/coach-live";
import { buildLiveSessionView } from "@/lib/live-session";
import { createLiveKitToken, resolveLessonLiveRoomName } from "@/lib/media/livekit";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ lessonId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { lessonId } = await context.params;
    const body = (await request.json()) as {
      action?: "reschedule" | "start" | "end" | "convert-replay";
      scheduledAt?: string;
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);

    if (body.action === "reschedule") {
      if (!body.scheduledAt?.trim()) {
        throw new ApiError("scheduledAt is required", 400, "VALIDATION_ERROR");
      }
      const session = await rescheduleCoachLiveSession({
        coachId: userId,
        lessonId,
        scheduledAt: body.scheduledAt,
      });
      return NextResponse.json({ session });
    }

    if (body.action === "start") {
      const metadata = await startCoachLiveSession({ coachId: userId, lessonId });
      return NextResponse.json({ session: buildLiveSessionView(metadata) });
    }

    if (body.action === "end") {
      const result = await endCoachLiveSession({ coachId: userId, lessonId });
      return NextResponse.json(result);
    }

    if (body.action === "convert-replay") {
      const result = await convertCoachLiveReplay({ coachId: userId, lessonId });
      return NextResponse.json(result);
    }

    throw new ApiError("action must be reschedule, start, end, or convert-replay", 400, "VALIDATION_ERROR");
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { lessonId } = await context.params;
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const metadata = await startCoachLiveSession({ coachId: userId, lessonId });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const roomName = resolveLessonLiveRoomName(lessonId, metadata.roomName);

    const token = await createLiveKitToken({
      roomName,
      identity: userId,
      name: user.name ?? user.email,
      canPublish: true,
    });

    return NextResponse.json(token);
  } catch (error) {
    return jsonError(error);
  }
}
