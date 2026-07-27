export const SESSION_COOKIE = "glia_session";

const SECRET = process.env.SESSION_SECRET ?? "dev-session-secret-change-me";

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signUserId(userId: string) {
  const key = await importHmacKey(SECRET);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(userId),
  );
  return bytesToHex(signature);
}

export async function signSession(userId: string) {
  const signature = await signUserId(userId);
  return `${userId}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) {
    return null;
  }

  const userId = token.slice(0, dotIndex);
  const signatureHex = token.slice(dotIndex + 1);

  if (!/^[0-9a-f]+$/i.test(signatureHex) || signatureHex.length % 2 !== 0) {
    return null;
  }

  try {
    const key = await importHmacKey(SECRET);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      hexToBytes(signatureHex),
      new TextEncoder().encode(userId),
    );

    return valid ? userId : null;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(maxAge = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
