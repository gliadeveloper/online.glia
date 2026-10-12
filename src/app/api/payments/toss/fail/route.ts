import { NextResponse } from "next/server";

import { getTossReturnOrigin } from "@/lib/request-origin";
import { isTossOrderId } from "@/lib/payments/toss/verify";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const FAILURE_CODE = /^[A-Z0-9_]{1,80}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getTossReturnOrigin(request);
  const dest = new URL("/orders", origin);
  const orderId = url.searchParams.get("orderId")?.trim() ?? "";
  const userId = await getSessionUserId();

  if (userId && isTossOrderId(orderId)) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId, checkout: "TOSS" },
      select: { id: true },
    });
    if (order) dest.pathname = `/orders/${order.id}`;
  }

  dest.searchParams.set("payment", "failed");
  const code = url.searchParams.get("code")?.trim() ?? "";
  if (FAILURE_CODE.test(code)) dest.searchParams.set("code", code);

  const response = NextResponse.redirect(dest);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
