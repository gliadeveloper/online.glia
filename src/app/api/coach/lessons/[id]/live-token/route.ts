import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { startCoachLiveSession } from "@/lib/coach-live";
import { buildLiveSessionView } from "@/lib/live-session";
import {
  isLiveKitMetadata,
  parseContentMetadata,
} from "@/lib/media/content-metadata";
import { createLiveKitToken, resolveLessonLiveRoomName } from "@/lib/media/livekit";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const metadata = await startCoachLiveSession({ coachId: userId, lessonId });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const roomName = resolveLessonLiveRoomName(lessonId, metadata.roomName);

    const session = await createLiveKitToken({
      roomName,
      identity: userId,
      name: user.name ?? user.email,
      canPublish: true,
    });

    return NextResponse.json({
      ...session,
      liveSession: buildLiveSessionView(metadata),
    });
  } catch (error) {
    return jsonError(error);
  }
}
