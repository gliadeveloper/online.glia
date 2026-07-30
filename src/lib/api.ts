import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function resolveUserId(request: Request, body?: { userId?: string }) {
  const { getSessionUserId } = await import("@/lib/session");
  const sessionUserId = await getSessionUserId();
  if (sessionUserId) {
    return sessionUserId;
  }

  const headerUserId = request.headers.get("x-user-id")?.trim();
  const bodyUserId = body?.userId?.trim();
  const userId = headerUserId || bodyUserId;

  if (!userId) {
    throw new ApiError("Login required", 401, "UNAUTHORIZED");
  }

  return userId;
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function assertAdmin(userId: string) {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || user.role !== "ADMIN") {
    throw new ApiError("Admin access required", 403, "FORBIDDEN");
  }

  return user;
}

export async function assertCoach(userId: string) {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || user.role !== "COACH") {
    throw new ApiError("Coach access required", 403, "FORBIDDEN");
  }

  return user;
}
