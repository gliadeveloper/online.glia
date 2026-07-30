export {
  SESSION_COOKIE,
  getSessionCookieOptions,
  hasSessionTokenFormat,
} from "@/lib/session-cookie";

export async function verifySessionToken(token: string | undefined | null) {
  const { hasSessionTokenFormat } = await import("@/lib/session-cookie");

  if (!hasSessionTokenFormat(token)) {
    return null;
  }

  const { verifyAuthSession } = await import("@/lib/auth-session");
  return verifyAuthSession(token);
}
