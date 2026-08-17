import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const status = url.searchParams.get("status");

    const orders = await prisma.order.findMany({
      where: status ? { status: status as "PENDING" | "PAID" | "CANCELLED" | "REFUNDED" } : undefined,
      orderBy: { createdAt: "desc" },
      take: Number(url.searchParams.get("limit") ?? 50),
      include: {
        user: { select: { id: true, name: true, email: true } },
        lines: {
          include: {
            product: { select: { id: true, title: true } },
          },
        },
        payments: {
          select: { id: true, status: true, amount: true, provider: true, paidAt: true },
          take: 1,
        },
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    return jsonError(error);
  }
}
