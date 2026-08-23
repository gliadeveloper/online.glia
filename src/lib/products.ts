import type { Prisma, Product, ProductItemKind, ProductKind } from "@/generated/prisma/client";
import { Prisma as PrismaRuntime } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export const productInclude = {
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      course: { select: { id: true, title: true, status: true } },
      coachingOffering: {
        select: {
          id: true,
          slug: true,
          title: true,
          totalSessions: true,
          isActive: true,
        },
      },
    },
  },
  organization: { select: { id: true, name: true, slug: true } },
  _count: { select: { orderLines: true } },
};

export const productKindLabels: Record<ProductKind, string> = {
  COURSE_ONLY: "VOD 단품",
  COACHING_ONLY: "코칭 단품",
  BUNDLE: "번들",
};

export function parseProductSupplies(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

export function suppliesToText(supplies: string[] | null | undefined) {
  return (supplies ?? []).join("\n");
}

type ProductItemInput = {
  kind: ProductItemKind;
  courseId?: string;
  coachingOfferingId?: string;
  sortOrder?: number;
};

export async function createProduct(params: {
  actorId: string;
  title: string;
  description?: string;
  descriptionMetadata?: Prisma.InputJsonValue | null;
  supplies?: string[];
  kind: ProductKind;
  listPrice: number;
  salePrice?: number;
  currency?: string;
  organizationId?: string;
  items: ProductItemInput[];
  activate?: boolean;
}) {
  validateProductItems(params.kind, params.items);

  const product = await prisma.product.create({
    data: {
      title: params.title.trim(),
      description: params.description?.trim(),
      descriptionMetadata: params.descriptionMetadata ?? undefined,
      supplies: params.supplies ?? [],
      kind: params.kind,
      listPrice: params.listPrice,
      salePrice: params.salePrice,
      currency: params.currency ?? "KRW",
      organizationId: params.organizationId,
      isActive: params.activate ?? true,
      publishedAt: params.activate === false ? null : new Date(),
      items: {
        create: params.items.map((item, index) => ({
          kind: item.kind,
          courseId: item.courseId,
          coachingOfferingId: item.coachingOfferingId,
          sortOrder: item.sortOrder ?? index + 1,
        })),
      },
    },
    include: productInclude,
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Product",
    entityId: product.id,
    action: "PRODUCT_CREATED",
    metadata: { productId: product.id, kind: product.kind },
  });

  return product;
}

export async function updateProduct(params: {
  actorId: string;
  productId: string;
  title?: string;
  description?: string;
  descriptionMetadata?: Prisma.InputJsonValue | null;
  supplies?: string[];
  listPrice?: number;
  salePrice?: number | null;
  isActive?: boolean;
}) {
  const existing = await prisma.product.findUnique({ where: { id: params.productId } });
  if (!existing) {
    throw new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  const descriptionMetadata =
    params.descriptionMetadata === undefined
      ? undefined
      : params.descriptionMetadata === null
        ? PrismaRuntime.JsonNull
        : params.descriptionMetadata;

  const product = await prisma.product.update({
    where: { id: params.productId },
    data: {
      title: params.title?.trim(),
      description: params.description?.trim(),
      descriptionMetadata,
      supplies: params.supplies,
      listPrice: params.listPrice,
      salePrice: params.salePrice,
      isActive: params.isActive,
      publishedAt:
        params.isActive === true && !existing.publishedAt ? new Date() : existing.publishedAt,
    },
    include: productInclude,
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Product",
    entityId: product.id,
    action: params.isActive === false ? "PRODUCT_DEACTIVATED" : "PRODUCT_UPDATED",
    metadata: { productId: product.id },
  });

  return product;
}

export async function updateProductItems(params: {
  actorId: string;
  productId: string;
  items: ProductItemInput[];
}) {
  const existing = await prisma.product.findUnique({
    where: { id: params.productId },
    include: { items: true },
  });
  if (!existing) {
    throw new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  validateProductItems(existing.kind, params.items);

  const product = await prisma.$transaction(async (tx) => {
    await tx.productItem.deleteMany({ where: { productId: params.productId } });
    await tx.productItem.createMany({
      data: params.items.map((item, index) => ({
        productId: params.productId,
        kind: item.kind,
        courseId: item.courseId,
        coachingOfferingId: item.coachingOfferingId,
        sortOrder: item.sortOrder ?? index + 1,
      })),
    });

    return tx.product.findUniqueOrThrow({
      where: { id: params.productId },
      include: productInclude,
    });
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Product",
    entityId: product.id,
    action: "PRODUCT_ITEMS_UPDATED",
    metadata: { productId: product.id, itemCount: params.items.length },
  });

  return product;
}

function validateProductItems(kind: ProductKind, items: ProductItemInput[]) {
  if (!items.length) {
    throw new ApiError("Product items are required", 400, "VALIDATION_ERROR");
  }

  if (kind === "COURSE_ONLY") {
    const valid = items.every((item) => item.kind === "COURSE_ACCESS" && item.courseId);
    if (!valid) {
      throw new ApiError("COURSE_ONLY requires COURSE_ACCESS item", 400, "VALIDATION_ERROR");
    }
  }

  if (kind === "COACHING_ONLY") {
    const valid = items.every(
      (item) => item.kind === "COACHING_ACCESS" && item.coachingOfferingId,
    );
    if (!valid) {
      throw new ApiError("COACHING_ONLY requires COACHING_ACCESS item", 400, "VALIDATION_ERROR");
    }
  }

  if (kind === "BUNDLE") {
    const hasCourse = items.some((item) => item.kind === "COURSE_ACCESS" && item.courseId);
    const hasCoaching = items.some(
      (item) => item.kind === "COACHING_ACCESS" && item.coachingOfferingId,
    );
    if (!hasCourse || !hasCoaching) {
      throw new ApiError("BUNDLE requires course and coaching items", 400, "VALIDATION_ERROR");
    }
  }
}

export function getProductDisplayPrice(product: Pick<Product, "listPrice" | "salePrice">) {
  return product.salePrice ?? product.listPrice;
}
