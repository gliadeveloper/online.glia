import { NextResponse } from "next/server";

import { ApiError, jsonError, requireSessionUserId } from "@/lib/api";
import { getProductPrice } from "@/lib/fulfillment";
import { redeemShopCouponCode } from "@/lib/shop-coupon";
import { getProductById } from "@/lib/shop-products";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const userId = await requireSessionUserId();
    const body = (await request.json()) as { code?: string };
    if (!id.trim()) throw new ApiError("상품을 확인해 주세요.", 400, "PRODUCT_ID_REQUIRED");

    const product = await getProductById(id);
    if (!product) throw new ApiError("상품을 확인해 주세요.", 404, "PRODUCT_NOT_FOUND");

    const result = await redeemShopCouponCode(userId, product.id, body.code ?? "", getProductPrice(product));
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
