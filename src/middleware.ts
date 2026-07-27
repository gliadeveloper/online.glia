import { type NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

const protectedPrefixes = ["/dashboard", "/shop", "/lms", "/coaching", "/checkin", "/orders", "/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const userId = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (userId) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/shop/:path*",
    "/lms/:path*",
    "/coaching/:path*",
    "/checkin/:path*",
    "/orders/:path*",
    "/admin/:path*",
  ],
};
