import { NextResponse } from "next/server";

import { ApiError, jsonError, resolveUserId } from "@/lib/api";
import { updateCoachingSession } from "@/lib/coaching";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      action?: "cancel" | "complete";
      cancelReason?: string;
    };

    const userId = await resolveUserId(request, body);

    if (body.action !== "cancel" && body.action !== "complete") {
      throw new ApiError('action must be "cancel" or "complete"', 400, "INVALID_ACTION");
    }

    const session = await updateCoachingSession({
      userId,
      sessionId: id,
      action: body.action,
      cancelReason: body.cancelReason?.trim(),
    });

    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error);
  }
}
