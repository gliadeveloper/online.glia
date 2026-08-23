import { type NextRequest, NextResponse } from "next/server";

import { hasSessionTokenFormat, SESSION_COOKIE } from "@/lib/session-cookie";

const protectedPrefixes = ["/shop", "/learning", "/coaching", "/checkin", "/orders", "/admin", "/coach", "/mypage"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/lms" || pathname.startsWith("/lms/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/lms/, "/learning");
    return NextResponse.redirect(url);
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

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
    "/dashboard",
    "/dashboard/:path*",
    "/shop/:path*",
    "/lms/:path*",
    "/learning/:path*",
    "/coaching/:path*",
    "/checkin/:path*",
    "/orders/:path*",
    "/admin/:path*",
    "/coach/:path*",
    "/mypage",
    "/mypage/:path*",
  ],
};
