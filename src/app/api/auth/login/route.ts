import { NextResponse } from "next/server";

import { attachSessionCookie } from "@/lib/auth-session";
import { ApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

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
        status: true,
      },
    });

    if (!user || user.status !== "ACTIVE" || !user.password || user.password !== password) {
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

    await attachSessionCookie(response, user.id, request);

    return response;
  } catch (error) {
    return jsonError(error);
  }
}
