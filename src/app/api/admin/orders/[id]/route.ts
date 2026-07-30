import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const orderInclude = {
  user: { select: { id: true, name: true, email: true } },
  lines: {
    include: {
      product: {
        include: {
          items: {
            include: {
              course: { select: { id: true, title: true, slug: true } },
              coachingOffering: { select: { id: true, title: true, slug: true } },
            },
          },
        },
      },
      entitlementGrants: {
        include: {
          enrollment: { select: { id: true, status: true, courseId: true } },
          coachingEntitlement: {
            select: {
              id: true,
              status: true,
              totalSessions: true,
              completedSessions: true,
            },
          },
        },
      },
    },
  },
  payments: true,
  fulfillments: {
    include: {
      grants: {
        include: {
          enrollment: true,
          coachingEntitlement: true,
        },
      },
    },
  },
  refunds: true,
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const order = await prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });

    if (!order) {
      throw new ApiError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    return NextResponse.json(order);
  } catch (error) {
    return jsonError(error);
  }
}
