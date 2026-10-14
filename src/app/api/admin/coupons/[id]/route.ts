import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { parseShopCouponWrite, updateShopCoupon } from "@/lib/shop-coupon-admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);
    const coupon = await updateShopCoupon(userId, id, parseShopCouponWrite(body));
    return NextResponse.json({ id: coupon.id });
  } catch (error) {
    return jsonError(error);
  }
}
