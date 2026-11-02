import { NextResponse } from "next/server";

import { syncLessonLiveReminders } from "@/lib/alimtalk/notify";
import { ApiError, assertCoach, jsonError, requireSessionUserId } from "@/lib/api";
import { getLessonDetail } from "@/lib/assessment-admin";
import { assertCoachOwnsLesson } from "@/lib/coach-courses";
import { deleteLesson, updateLesson } from "@/lib/curriculum-admin";
import { prisma } from "@/lib/prisma";
import type { LessonType } from "@/generated/prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await requireSessionUserId();
    await assertCoach(userId);
    await assertCoachOwnsLesson(userId, id);

    const lesson = await getLessonDetail(id);
    return NextResponse.json(lesson);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      type?: LessonType;
      duration?: number;
      isFree?: boolean;
      order?: number;
    };

    const userId = await requireSessionUserId();
    await assertCoach(userId);
    await assertCoachOwnsLesson(userId, id);

    const title = body.title === undefined ? undefined : body.title.trim();
    if (title !== undefined && !title) {
      throw new ApiError("레슨 제목을 입력해 주세요.", 400, "VALIDATION_ERROR");
    }
    if (title && [...title].length > 120) {
      throw new ApiError("레슨 제목은 120자 이내로 입력해 주세요.", 400, "VALIDATION_ERROR");
    }

    const before = await prisma.lesson.findUnique({
      where: { id },
      select: { title: true, type: true, scheduledStartAt: true },
    });

    const lesson = await updateLesson({
      actorId: userId,
      lessonId: id,
      title,
      description: body.description,
      type: body.type,
      duration: body.duration,
      isFree: body.isFree,
      order: body.order,
    });

    const titleChanged = title !== undefined && before?.title !== lesson.title;
    const upcomingLive =
      before?.type === "LIVE" &&
      !!before.scheduledStartAt &&
      before.scheduledStartAt.getTime() > Date.now();
    if (titleChanged && upcomingLive) {
      try {
        await syncLessonLiveReminders(id);
      } catch (error) {
        console.error("[alimtalk] lesson title", error instanceof Error ? error.message : error);
        throw new ApiError("제목은 저장됐지만 알림 예약에 실패했습니다.", 502, "ALIMTALK_RESERVE_FAILED");
      }
    }

    return NextResponse.json(lesson);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await requireSessionUserId();
    await assertCoach(userId);
    await assertCoachOwnsLesson(userId, id);

    await deleteLesson({ actorId: userId, lessonId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
