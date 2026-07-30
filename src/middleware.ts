import { type NextRequest, NextResponse } from "next/server";

import { hasSessionTokenFormat, SESSION_COOKIE } from "@/lib/session-cookie";

const protectedPrefixes = ["/dashboard", "/shop", "/lms", "/learning", "/coaching", "/checkin", "/orders", "/admin", "/mypage"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (hasSessionTokenFormat(token)) {
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
    "/learning/:path*",
    "/coaching/:path*",
    "/checkin/:path*",
    "/orders/:path*",
    "/admin/:path*",
    "/mypage",
    "/mypage/:path*",
  ],
};
