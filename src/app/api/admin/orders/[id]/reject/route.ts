import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { rejectProductApplication } from "@/lib/fulfillment";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(request);
    await assertAdmin(userId);

    const body = (await request.json().catch(() => ({}))) as { reason?: string };

    const rejected = await rejectProductApplication({
      orderId: id,
      actorId: userId,
      reason: body.reason?.trim(),
    });

    return NextResponse.json(rejected);
  } catch (error) {
    return jsonError(error);
  }
}
