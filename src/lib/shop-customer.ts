import { prisma } from "@/lib/prisma";

export async function getPurchasedProductIds(userId: string) {
  const lines = await prisma.orderLine.findMany({
    where: {
      order: {
        userId,
        status: { in: ["PAID", "PARTIALLY_REFUNDED"] },
      },
    },
    select: {
      product: { select: { id: true } },
    },
  });

  return new Set(lines.map((line) => line.product.id));
}
