import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { attachSessionCookie } from "@/lib/auth-session";
import { resolvePostLoginPath } from "@/lib/auth-redirect";
import { KakaoAuthError } from "@/lib/kakao-auth-error";
import {
  exchangeKakaoCode,
  fetchKakaoUser,
  getKakaoConfig,
  upsertUserFromKakao,
} from "@/lib/kakao-auth";
import {
  getOAuthStateCookieOptions,
  OAUTH_STATE_COOKIE,
  verifyOAuthState,
} from "@/lib/oauth-state";

function loginErrorRedirect(request: Request, message: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

function mapKakaoError(error: unknown) {
  if (error instanceof KakaoAuthError) {
    if (error.code === "KOE010" || error.message.includes("Bad client credentials")) {
      return "kakao_bad_credentials";
    }
  }
  return "kakao_failed";
}

export async function GET(request: Request) {
  if (!getKakaoConfig()) {
    return loginErrorRedirect(request, "kakao_not_configured");
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const kakaoError = searchParams.get("error");

  if (kakaoError) {
    return loginErrorRedirect(request, "kakao_denied");
  }

  if (!code || !state) {
    return loginErrorRedirect(request, "kakao_invalid_request");
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(OAUTH_STATE_COOKIE)?.value ?? null;
  const verifiedState = await verifyOAuthState(stateCookie ?? state);

  if (!verifiedState || (stateCookie && stateCookie !== state)) {
    return loginErrorRedirect(request, "kakao_invalid_state");
  }

  try {
    const token = await exchangeKakaoCode(code);
    const kakaoUser = await fetchKakaoUser(token.access_token);
    const user = await upsertUserFromKakao({
      kakaoUser,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: token.expires_in ?? 0,
      scopes: token.scope,
    });

    const redirectPath = resolvePostLoginPath(verifiedState.next, user.role);
    const origin = new URL(request.url).origin;
    const response = NextResponse.redirect(`${origin}${redirectPath}`);

    await attachSessionCookie(response, user.id, request);
    response.cookies.set(OAUTH_STATE_COOKIE, "", { ...getOAuthStateCookieOptions(0), maxAge: 0 });

    return response;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[kakao/callback]", error);
    }
    return loginErrorRedirect(request, mapKakaoError(error));
  }
}
