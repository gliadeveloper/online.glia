import { prisma } from "@/lib/prisma";
import { orderInclude } from "@/lib/fulfillment";

export async function getUserOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      lines: {
        include: {
          product: { select: { title: true, kind: true, slug: true } },
        },
      },
    },
  });
}

export async function getUserOrder(userId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    include: orderInclude,
  });
}

export type UserOrder = Awaited<ReturnType<typeof getUserOrders>>[number];
export type UserOrderDetail = NonNullable<Awaited<ReturnType<typeof getUserOrder>>>;
