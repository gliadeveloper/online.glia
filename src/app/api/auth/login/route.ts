import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  getSessionCookieOptions,
  SESSION_COOKIE,
  signSession,
} from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!email || !password) {
      throw new ApiError("email and password are required", 400, "VALIDATION_ERROR");
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
      },
    });

    if (!user || user.password !== password) {
      throw new ApiError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    response.cookies.set(
      SESSION_COOKIE,
      await signSession(user.id),
      getSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    return jsonError(error);
  }
}
