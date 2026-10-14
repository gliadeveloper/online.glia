import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { parseShopCouponWrite } from "@/lib/shop-coupon-admin";
import { createCoachShopCoupon } from "@/lib/shop-coupon-coach";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const userId = await resolveUserId(request, body);
    await assertCoach(userId);
    const coupon = await createCoachShopCoupon(userId, parseShopCouponWrite(body));
    return NextResponse.json({ id: coupon.id }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
