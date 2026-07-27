import { NextResponse } from "next/server";

import { getSessionCookieOptions, SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...getSessionCookieOptions(0), maxAge: 0 });
  return response;
}
