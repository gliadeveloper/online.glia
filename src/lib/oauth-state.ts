const OAUTH_STATE_COOKIE = "glia_oauth_state";
const OAUTH_STATE_MAX_AGE = 60 * 10;

const SECRET = process.env.SESSION_SECRET ?? "dev-session-secret-change-me";

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signPayload(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToHex(signature);
}

function encodeStatePayload(next?: string | null) {
  const nonce = bytesToHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const expiresAt = Date.now() + OAUTH_STATE_MAX_AGE * 1000;
  const nextPath = next && next.startsWith("/") && !next.startsWith("//") ? next : "";
  return `${nonce}:${expiresAt}:${nextPath}`;
}

export async function createOAuthState(next?: string | null) {
  const payload = encodeStatePayload(next);
  const signature = await signPayload(payload);
  return `${payload}:${signature}`;
}

export async function verifyOAuthState(state: string | null | undefined) {
  if (!state) {
    return null;
  }

  const lastColon = state.lastIndexOf(":");
  if (lastColon === -1) {
    return null;
  }

  const payload = state.slice(0, lastColon);
  const signature = state.slice(lastColon + 1);
  const expected = await signPayload(payload);

  if (signature !== expected) {
    return null;
  }

  const [nonce, expiresAtRaw, nextPath] = payload.split(":");
  if (!nonce || !expiresAtRaw) {
    return null;
  }

  const expiresAt = Number.parseInt(expiresAtRaw, 10);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }

  return {
    next: nextPath || null,
  };
}

export function getOAuthStateCookieOptions(maxAge = OAUTH_STATE_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export { OAUTH_STATE_COOKIE, OAUTH_STATE_MAX_AGE };
