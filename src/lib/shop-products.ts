import { prisma } from "@/lib/prisma";

export const productCatalogInclude = {
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          defaultAccessDuration: true,
          defaultAccessDays: true,
        },
      },
      coachingOffering: {
        select: { id: true, title: true, totalSessions: true, validDays: true },
      },
    },
  },
} as const;

export async function getActiveProducts(limit?: number) {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: productCatalogInclude,
  });

  const sorted = [...products].sort((a, b) => {
    if (a.kind === "BUNDLE" && b.kind !== "BUNDLE") return -1;
    if (b.kind === "BUNDLE" && a.kind !== "BUNDLE") return 1;
    return a.title.localeCompare(b.title, "ko");
  });

  return limit ? sorted.slice(0, limit) : sorted;
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isActive: true },
    include: productCatalogInclude,
  });
}

export type CatalogProduct = Awaited<ReturnType<typeof getActiveProducts>>[number];
