import { NextResponse } from "next/server";

import { attachSessionCookie } from "@/lib/auth-session";
import { AUTH_ERROR_MESSAGES } from "@/lib/auth-errors";
import { ApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/signup/crypto";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!email || !password) {
      throw new ApiError(AUTH_ERROR_MESSAGES.VALIDATION_ERROR, 400, "VALIDATION_ERROR");
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        status: true,
        onboardingCompletedAt: true,
      },
    });

    if (
      !user ||
      user.status !== "ACTIVE" ||
      !user.password ||
      !(await verifyPassword(user.password, password))
    ) {
      throw new ApiError(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS, 401, "INVALID_CREDENTIALS");
    }

    if (!user.onboardingCompletedAt) {
      throw new ApiError("온보딩을 먼저 완료해 주세요.", 409, "ONBOARDING_INCOMPLETE");
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    await attachSessionCookie(response, user.id, request);

    return response;
  } catch (error) {
    return jsonError(error);
  }
}
