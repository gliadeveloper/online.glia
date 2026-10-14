import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { createShopCoupon, parseShopCouponWrite } from "@/lib/shop-coupon-admin";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);
    const coupon = await createShopCoupon(userId, parseShopCouponWrite(body));
    return NextResponse.json({ id: coupon.id }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
