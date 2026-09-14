import { NextResponse } from "next/server";

import { jsonError, resolveUserId } from "@/lib/api";
import { deleteCoachingSessionLog } from "@/lib/coaching-session-logs";

type RouteContext = { params: Promise<{ id: string; logId: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id, logId } = await context.params;
    const userId = await resolveUserId(request);

    await deleteCoachingSessionLog({
      sessionId: id,
      logId,
      authorId: userId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
