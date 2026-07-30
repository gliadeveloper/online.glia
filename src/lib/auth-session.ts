import type { NextResponse } from "next/server";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashSessionToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToHex(digest);
}

function createRawSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes.buffer);
}

export function getSessionMaxAgeSeconds() {
  return SESSION_MAX_AGE_SECONDS;
}

type CreateAuthSessionInput = {
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export async function createAuthSession(input: CreateAuthSessionInput) {
  const { prisma } = await import("@/lib/prisma");

  const token = createRawSessionToken();
  const tokenHash = await hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: input.userId },
      data: { lastLoginAt: new Date() },
    }),
    prisma.authSession.create({
      data: {
        userId: input.userId,
        tokenHash,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null,
        expiresAt,
      },
    }),
  ]);

  return { token, expiresAt };
}

export async function verifyAuthSession(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  const { prisma } = await import("@/lib/prisma");
  const tokenHash = await hashSessionToken(token);
  const session = await prisma.authSession.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  if (session.user.status !== "ACTIVE") {
    return null;
  }

  void prisma.authSession
    .update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => undefined);

  return session.userId;
}

export async function revokeAuthSession(token: string | undefined | null) {
  if (!token) {
    return;
  }

  const { prisma } = await import("@/lib/prisma");
  const tokenHash = await hashSessionToken(token);

  await prisma.authSession.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function attachSessionCookie(
  response: NextResponse,
  userId: string,
  request?: Request,
) {
  const { getSessionCookieOptions, SESSION_COOKIE } = await import("@/lib/session-cookie");

  const { token } = await createAuthSession({
    userId,
    userAgent: request?.headers.get("user-agent"),
    ipAddress: request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });

  response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions(getSessionMaxAgeSeconds()));
}
