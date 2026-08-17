import { ApiError } from "@/lib/api";
import { listCoachProducts } from "@/lib/coach-commerce";
import { prisma } from "@/lib/prisma";

const coachOrderInclude = {
  user: { select: { id: true, name: true, email: true } },
  lines: {
    include: {
      product: { select: { id: true, title: true, kind: true } },
    },
  },
  payments: {
    select: { status: true, amount: true, provider: true, paidAt: true },
    take: 1,
  },
} as const;

const coachOrderDetailInclude = {
  user: { select: { id: true, name: true, email: true } },
  lines: {
    include: {
      product: {
        select: { id: true, title: true, kind: true },
      },
      entitlementGrants: {
        include: {
          enrollment: {
            select: { id: true, courseId: true, status: true, progressPercent: true },
          },
          coachingEntitlement: {
            select: {
              id: true,
              totalSessions: true,
              completedSessions: true,
              validUntil: true,
              status: true,
            },
          },
        },
      },
    },
  },
  payments: {
    orderBy: { createdAt: "desc" as const },
  },
  fulfillments: {
    orderBy: { createdAt: "desc" as const },
    select: { id: true, status: true, fulfilledAt: true },
  },
} as const;

export async function getCoachProductIds(coachId: string) {
  const products = await listCoachProducts(coachId);
  return products.map((product) => product.id);
}

async function assertCoachOrderAccess(coachId: string, orderId: string) {
  const productIds = await getCoachProductIds(coachId);
  if (productIds.length === 0) {
    throw new ApiError("Order access denied", 403, "FORBIDDEN");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: coachOrderInclude,
  });

  if (!order) {
    throw new ApiError("Order not found", 404, "ORDER_NOT_FOUND");
  }

  const hasCoachProduct = order.lines.some((line) => productIds.includes(line.productId));
  if (!hasCoachProduct) {
    throw new ApiError("Order access denied", 403, "FORBIDDEN");
  }

  return { orderId: order.id, coachProductIds: productIds };
}

export async function listCoachOrders(coachId: string) {
  const productIds = await getCoachProductIds(coachId);
  if (productIds.length === 0) return [];

  return prisma.order.findMany({
    where: {
      lines: { some: { productId: { in: productIds } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: coachOrderInclude,
  });
}

export async function getCoachOrder(coachId: string, orderId: string) {
  const { orderId: id, coachProductIds } = await assertCoachOrderAccess(coachId, orderId);

  const order = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: coachOrderDetailInclude,
  });

  return { order, coachProductIds };
}

export async function getCoachOrderStats(coachId: string) {
  const productIds = await getCoachProductIds(coachId);
  if (productIds.length === 0) {
    return { orderCount: 0, paidTotal: 0 };
  }

  const orders = await prisma.order.findMany({
    where: {
      status: "PAID",
      lines: { some: { productId: { in: productIds } } },
    },
    select: { total: true },
  });

  return {
    orderCount: orders.length,
    paidTotal: orders.reduce((sum, order) => sum + order.total, 0),
  };
}

export type CoachOrderRow = Awaited<ReturnType<typeof listCoachOrders>>[number];
export type CoachOrderDetail = Awaited<ReturnType<typeof getCoachOrder>>;
