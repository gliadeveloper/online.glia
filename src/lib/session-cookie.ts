export const SESSION_COOKIE = "glia_session";

const SESSION_TOKEN_PATTERN = /^[0-9a-f]{64}$/i;

/** Edge-safe shape check for middleware. Full validation uses auth_sessions on the server. */
export function hasSessionTokenFormat(token: string | undefined | null) {
  return typeof token === "string" && SESSION_TOKEN_PATTERN.test(token);
}

export function getSessionCookieOptions(maxAge = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
