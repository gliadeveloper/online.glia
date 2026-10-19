import { NextResponse } from "next/server";

import { ApiError, jsonError, requireSessionUserId } from "@/lib/api";
import { checkoutFreeCoupon } from "@/lib/fulfillment";

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const body = await request.json() as { productId?: unknown; couponIssueId?: unknown };
    if (typeof body.productId !== "string" || !body.productId.trim() ||
        typeof body.couponIssueId !== "string" || !body.couponIssueId.trim()) {
      throw new ApiError("상품과 쿠폰을 확인해 주세요.", 400, "COUPON_REQUIRED");
    }
    const result = await checkoutFreeCoupon({
      userId, productId: body.productId.trim(), couponIssueId: body.couponIssueId.trim(),
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
