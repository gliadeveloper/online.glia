import { NextResponse } from "next/server";

import { ApiError, jsonError, requireSessionUserId } from "@/lib/api";
import { prepareTossPayment } from "@/lib/payments/toss/payment";
import { getTossReturnOrigin } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { productId?: string; couponIssueId?: string; idempotencyKey?: string };
    const userId = await requireSessionUserId();
    const productId = body.productId?.trim();
    if (!productId) throw new ApiError("productId is required", 400, "PRODUCT_ID_REQUIRED");

    const payment = await prepareTossPayment({
      userId,
      productId,
      couponIssueId: body.couponIssueId?.trim() || undefined,
      idempotencyKey: body.idempotencyKey?.trim() || undefined,
      origin: getTossReturnOrigin(request),
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
