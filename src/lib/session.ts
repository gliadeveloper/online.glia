import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  getSessionCookieOptions,
  signSession,
  verifySessionToken,
} from "@/lib/session-token";

export {
  SESSION_COOKIE,
  getSessionCookieOptions,
  signSession,
  verifySessionToken,
} from "@/lib/session-token";

export async function getSessionUserId() {
  const cookieStore = await cookies();
  return await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
}
