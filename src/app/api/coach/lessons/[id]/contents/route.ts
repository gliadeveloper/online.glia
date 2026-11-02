import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, requireSessionUserId } from "@/lib/api";
import { assertCoachOwnsLesson } from "@/lib/coach-courses";
import { setLessonScheduledStart } from "@/lib/alimtalk/notify";
import { parseProductSupplies } from "@/lib/product-supplies";
import { createContent } from "@/lib/curriculum-admin";
import type { ContentType, Prisma } from "@/generated/prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const body = (await request.json()) as {
      type?: ContentType;
      title?: string;
      url?: string;
      body?: string;
      metadata?: Prisma.InputJsonValue | null;
      scheduledStartAt?: string;
      supplies?: string;
    };

    const userId = await requireSessionUserId();
    await assertCoach(userId);
    await assertCoachOwnsLesson(userId, lessonId);

    if (!body.type) {
      throw new ApiError("type is required", 400, "VALIDATION_ERROR");
    }

    const content = await createContent({
      actorId: userId,
      lessonId,
      type: body.type,
      title: body.title,
      url: body.url,
      body: body.body,
      metadata: body.metadata,
    });

    if (body.scheduledStartAt) {
      try {
        await setLessonScheduledStart(
          lessonId,
          body.scheduledStartAt,
          parseProductSupplies(body.supplies) ?? [],
        );
      } catch (error) {
        if (error instanceof Error && error.message === "LIVE_START_IN_PAST") {
          throw new ApiError("수업 시작 시각은 현재 이후여야 합니다.", 400, "LIVE_START_IN_PAST");
        }
        if (error instanceof Error && error.message === "LIVE_START_INVALID") {
          throw new ApiError("수업 시작 시각을 확인해 주세요.", 400, "LIVE_START_INVALID");
        }
        console.error("[alimtalk] live schedule", error instanceof Error ? error.message : error);
        throw new ApiError("수업 시각은 저장됐지만 알림 예약에 실패했습니다.", 502, "ALIMTALK_RESERVE_FAILED");
      }
    }

    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
