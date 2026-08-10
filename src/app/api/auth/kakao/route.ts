import { NextResponse } from "next/server";

import { AUTH_ERROR_MESSAGES } from "@/lib/auth-errors";
import { buildKakaoAuthorizeUrl, getKakaoConfig } from "@/lib/kakao-auth";
import {
  createOAuthState,
  getOAuthStateCookieOptions,
  OAUTH_STATE_COOKIE,
} from "@/lib/oauth-state";

export async function GET(request: Request) {
  const config = getKakaoConfig();
  if (!config) {
    return NextResponse.json(
      { error: AUTH_ERROR_MESSAGES.KAKAO_NOT_CONFIGURED, code: "KAKAO_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next");
  const state = await createOAuthState(next);
  const response = NextResponse.redirect(buildKakaoAuthorizeUrl(state));

  response.cookies.set(OAUTH_STATE_COOKIE, state, getOAuthStateCookieOptions());

  return response;
}
