import { NextResponse } from "next/server";

import { isUserRole, updateUserRole } from "@/lib/admin-users";
import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        enrollments: {
          include: { course: { select: { id: true, title: true } } },
          orderBy: { enrolledAt: "desc" },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            lines: { include: { product: { select: { title: true } } } },
          },
        },
        coachingEntitlements: {
          include: {
            coachingOffering: { select: { title: true, slug: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        formSubmissions: {
          orderBy: { updatedAt: "desc" },
          take: 10,
          include: { form: { select: { title: true, slug: true } } },
        },
        _count: {
          select: {
            enrollments: true,
            orders: true,
            coachingEntitlements: true,
            formSubmissions: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError("User not found", 404, "NOT_FOUND");
    }

    return NextResponse.json(user);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { userId?: string; role?: string };
    const actorId = await resolveUserId(request, body);
    await assertAdmin(actorId);

    if (!isUserRole(body.role)) {
      throw new ApiError("역할 값이 올바르지 않습니다.", 400, "INVALID_ROLE");
    }

    const user = await updateUserRole({
      actorId,
      userId: id,
      role: body.role,
    });

    return NextResponse.json(user);
  } catch (error) {
    return jsonError(error);
  }
}
