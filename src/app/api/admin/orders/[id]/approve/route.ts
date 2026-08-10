import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { approveProductApplication } from "@/lib/fulfillment";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(request);
    await assertAdmin(userId);

    const approved = await approveProductApplication({ orderId: id, actorId: userId });
    return NextResponse.json(approved);
  } catch (error) {
    return jsonError(error);
  }
}
