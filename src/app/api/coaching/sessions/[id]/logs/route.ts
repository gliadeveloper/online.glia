import { NextResponse } from "next/server";

import { ApiError, jsonError, resolveUserId } from "@/lib/api";
import { createCoachingSessionLog } from "@/lib/coaching-session-logs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { body?: string };
    const userId = await resolveUserId(request);

    if (!body.body?.trim()) {
      throw new ApiError("한줄 기록을 입력해 주세요.", 400, "VALIDATION_ERROR");
    }

    const log = await createCoachingSessionLog({
      sessionId: id,
      authorId: userId,
      body: body.body,
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
