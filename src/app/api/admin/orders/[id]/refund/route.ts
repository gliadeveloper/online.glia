import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { refundOrder } from "@/lib/order-refund";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      amount?: number;
      reason?: string;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    const result = await refundOrder({
      orderId: id,
      actorId: userId,
      amount: body.amount,
      reason: body.reason?.trim(),
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
