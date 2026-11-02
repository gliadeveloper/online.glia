import { NextResponse } from "next/server";

import { reportLiveReminders } from "@/lib/alimtalk/notify";
import { ApiError, jsonError, requireSessionUserId } from "@/lib/api";
import { checkoutFreeCoupon } from "@/lib/fulfillment";

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const body = await request.json() as { productId?: unknown; couponIssueId?: unknown };
    if (typeof body.productId !== "string" || !body.productId.trim()) {
      throw new ApiError("상품을 확인해 주세요.", 400, "VALIDATION_ERROR");
    }
    const couponIssueId =
      typeof body.couponIssueId === "string" && body.couponIssueId.trim()
        ? body.couponIssueId.trim()
        : null;
    const result = await checkoutFreeCoupon({
      userId,
      productId: body.productId.trim(),
      couponIssueId,
    });
    await reportLiveReminders(result.orderId);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
