import { NextResponse } from "next/server";

import { ApiError, jsonError, resolveUserId } from "@/lib/api";
import { orderInclude } from "@/lib/fulfillment";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });

    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: orderInclude,
    });

    if (!order) {
      throw new ApiError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    return NextResponse.json(order);
  } catch (error) {
    return jsonError(error);
  }
}
