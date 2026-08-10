import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { approveProductApplication } from "@/lib/fulfillment";
import { getCoachProductIds } from "@/lib/coach-orders";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const productIds = await getCoachProductIds(userId);
    const order = await prisma.order.findUnique({
      where: { id },
      include: { lines: { select: { productId: true } } },
    });

    if (!order) {
      throw new ApiError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    const hasCoachProduct = order.lines.some((line) => productIds.includes(line.productId));
    if (!hasCoachProduct) {
      throw new ApiError("Order access denied", 403, "FORBIDDEN");
    }

    const approved = await approveProductApplication({ orderId: id, actorId: userId });
    return NextResponse.json(approved);
  } catch (error) {
    return jsonError(error);
  }
}
