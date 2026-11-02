import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, requireSessionUserId } from "@/lib/api";
import { assertCoachOwnsContent } from "@/lib/coach-courses";
import { setLessonScheduledStart } from "@/lib/alimtalk/notify";
import { parseProductSupplies } from "@/lib/product-supplies";
import { deleteContent, updateContent } from "@/lib/curriculum-admin";
import type { ContentType, Prisma } from "@/generated/prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: contentId } = await context.params;
    const body = (await request.json()) as {
      expectedBodyVersion?: string;
      title?: string;
      url?: string;
      body?: string;
      type?: ContentType;
      metadata?: Prisma.InputJsonValue | null;
      scheduledStartAt?: string;
      supplies?: string;
    };

    const userId = await requireSessionUserId();
    await assertCoach(userId);
    await assertCoachOwnsContent(userId, contentId);

    const content = await updateContent({
      actorId: userId,
      contentId,
      title: body.title,
      url: body.url,
      body: body.body,
      type: body.type,
      metadata: body.metadata,
      expectedBodyVersion: body.expectedBodyVersion,
    });

    if (body.scheduledStartAt) {
      try {
        await setLessonScheduledStart(
          content.lessonId,
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

    return NextResponse.json(content);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id: contentId } = await context.params;
    const userId = await requireSessionUserId();
    await assertCoach(userId);
    await assertCoachOwnsContent(userId, contentId);

    await deleteContent({ actorId: userId, contentId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
