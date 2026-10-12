import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, requireSessionUserId } from "@/lib/api";
import { parseCoachScheduledAt } from "@/lib/coach-coaching-board";
import { coachUpdateSession, getCoachSessionDetail } from "@/lib/coaching-coach";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await requireSessionUserId();
    await assertCoach(userId);

    const session = await getCoachSessionDetail(id, userId);
    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      expectedBodyVersion?: string;
      summary?: string | null;
      bodyMarkdown?: string | null;
      bodyMetadata?: import("@/generated/prisma/client").Prisma.InputJsonValue | null;
      publicationStatus?: "DRAFT" | "PUBLISHED" | "EMPTY";
      scheduledAt?: string;
    };

    const userId = await requireSessionUserId();
    await assertCoach(userId);

    let scheduledAt: Date | undefined;
    if (body.scheduledAt) {
      const parsed = parseCoachScheduledAt(body.scheduledAt);
      if (!parsed) {
        throw new ApiError("발행일이 올바르지 않습니다.", 400, "VALIDATION_ERROR");
      }
      scheduledAt = parsed;
    }

    const session = await coachUpdateSession({
      coachId: userId,
      sessionId: id,
      summary: body.summary,
      bodyMarkdown: body.bodyMarkdown,
      bodyMetadata: body.bodyMetadata,
      expectedBodyVersion: body.expectedBodyVersion,
      publicationStatus: body.publicationStatus,
      scheduledAt,
    });

    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error);
  }
}
