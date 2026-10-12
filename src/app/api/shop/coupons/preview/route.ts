import { NextResponse } from "next/server";

import { jsonError, requireSessionUserId } from "@/lib/api";
import { previewShopCoupon } from "@/lib/shop-coupon";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireSessionUserId();
    const body = (await request.json()) as { code?: string };
    const preview = previewShopCoupon(body.code ?? "");
    if (!preview.ok) {
      return NextResponse.json({ error: preview.message }, { status: 400 });
    }
    return NextResponse.json(preview);
  } catch (error) {
    return jsonError(error);
  }
}
