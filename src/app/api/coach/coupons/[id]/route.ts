import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { parseShopCouponWrite } from "@/lib/shop-coupon-admin";
import { updateCoachShopCoupon } from "@/lib/shop-coupon-coach";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const userId = await resolveUserId(request, body);
    await assertCoach(userId);
    const coupon = await updateCoachShopCoupon(userId, id, parseShopCouponWrite(body));
    return NextResponse.json({ id: coupon.id });
  } catch (error) {
    return jsonError(error);
  }
}
