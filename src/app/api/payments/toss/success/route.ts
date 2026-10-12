import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api";
import { confirmTossPayment } from "@/lib/payments/toss/payment";
import { parseTossSuccessQuery } from "@/lib/payments/toss/verify";
import { getTossReturnOrigin } from "@/lib/request-origin";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

function isPrefetch(request: Request) {
  const purpose = request.headers.get("purpose") ?? request.headers.get("sec-purpose");
  return purpose === "prefetch" || request.headers.get("next-router-prefetch") === "1";
}

function redirectTo(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: Request) {
  if (isPrefetch(request)) {
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  const url = new URL(request.url);
  const origin = getTossReturnOrigin(request);
  const success = parseTossSuccessQuery(url.searchParams);
  if (!success) {
    return redirectTo(new URL("/orders?payment=failed", origin));
  }

  const userId = await getSessionUserId();
  if (!userId) {
    const login = new URL("/login", origin);
    login.searchParams.set("next", `${url.pathname}${url.search}`);
    return redirectTo(login);
  }

  try {
    const result = await confirmTossPayment({ userId, success });
    const dest = new URL(`/orders/${result.orderId}`, origin);
    dest.searchParams.set(result.granted ? "purchased" : "payment", result.granted ? "1" : "test");
    return redirectTo(dest);
  } catch (error) {
    const dest = new URL(`/orders/${success.orderId}`, origin);
    dest.searchParams.set("payment", "failed");
    if (error instanceof ApiError && error.code && /^[A-Z0-9_]+$/.test(error.code)) {
      dest.searchParams.set("code", error.code);
    }
    return redirectTo(dest);
  }
}
