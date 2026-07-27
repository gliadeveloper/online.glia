import { prisma } from "@/lib/prisma";

export async function getPurchasedProductSlugs(userId: string) {
  const lines = await prisma.orderLine.findMany({
    where: {
      order: {
        userId,
        status: { in: ["PAID", "PARTIALLY_REFUNDED"] },
      },
    },
    select: {
      product: { select: { slug: true } },
    },
  });

  return new Set(lines.map((line) => line.product.slug));
}
