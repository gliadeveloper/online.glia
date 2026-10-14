import { NextResponse } from "next/server";

import { ApiError, jsonError, requireSessionUserId } from "@/lib/api";
import { downloadShopCoupons } from "@/lib/shop-coupon";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const userId = await requireSessionUserId();
    const body = (await request.json()) as { couponIds?: string[] };
    const couponIds = Array.isArray(body.couponIds) ? body.couponIds : [];
    if (!id.trim()) throw new ApiError("상품을 확인해 주세요.", 400, "PRODUCT_ID_REQUIRED");

    const error = await downloadShopCoupons(userId, id, couponIds);
    return NextResponse.json({ ok: error == null, error });
  } catch (error) {
    return jsonError(error);
  }
}
