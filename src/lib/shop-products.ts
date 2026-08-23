import { cache } from "react";

import { prisma } from "@/lib/prisma";

const courseCatalogSelect = {
  id: true,
  title: true,
  description: true,
  thumbnailUrl: true,
  level: true,
  defaultAccessDuration: true,
  defaultAccessDays: true,
  instructor: {
    select: {
      id: true,
      name: true,
      email: true,
      profile: { select: { headline: true, bio: true } },
    },
  },
  modules: {
    orderBy: { order: "asc" as const },
    select: {
      id: true,
      title: true,
      description: true,
      order: true,
      lessons: {
        orderBy: { order: "asc" as const },
        select: {
          id: true,
          title: true,
          type: true,
          duration: true,
          order: true,
        },
      },
    },
  },
} as const;

export const productCatalogInclude = {
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      course: {
        select: courseCatalogSelect,
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

export const getProductById = cache(async (id: string) => {
  return prisma.product.findFirst({
    where: { id, isActive: true },
    include: productCatalogInclude,
  });
});

export type CatalogProduct = Awaited<ReturnType<typeof getActiveProducts>>[number];
