import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { revokeAuthSession } from "@/lib/auth-session";
import { getSessionCookieOptions, SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  await revokeAuthSession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...getSessionCookieOptions(0), maxAge: 0 });
  return response;
}
