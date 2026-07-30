import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { assertCoachOwnsLesson } from "@/lib/coach-courses";
import {
  endCoachLiveSession,
  startCoachLiveSession,
} from "@/lib/coach-live";
import { buildLiveSessionView } from "@/lib/live-session";
import {
  isLiveKitMetadata,
  parseContentMetadata,
} from "@/lib/media/content-metadata";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

async function getLiveContent(lessonId: string) {
  return prisma.content.findFirst({
    where: { lessonId },
    orderBy: { order: "asc" },
  });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const userId = await resolveUserId(request);
    await assertCoach(userId);
    await assertCoachOwnsLesson(userId, lessonId);

    const content = await getLiveContent(lessonId);
    const metadata = parseContentMetadata(content?.metadata);
    if (!isLiveKitMetadata(metadata)) {
      return NextResponse.json(buildLiveSessionView(null));
    }

    return NextResponse.json(buildLiveSessionView(metadata));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const body = (await request.json()) as { action?: "start" | "end" };

    const userId = await resolveUserId(request);
    await assertCoach(userId);
    await assertCoachOwnsLesson(userId, lessonId);

    if (body.action === "start") {
      const metadata = await startCoachLiveSession({ coachId: userId, lessonId });
      return NextResponse.json(buildLiveSessionView(metadata));
    }

    if (body.action === "end") {
      const result = await endCoachLiveSession({ coachId: userId, lessonId });
      return NextResponse.json(result);
    }

    throw new ApiError("action must be start or end", 400, "VALIDATION_ERROR");
  } catch (error) {
    return jsonError(error);
  }
}
