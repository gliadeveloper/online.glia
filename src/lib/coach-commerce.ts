import type { Prisma, ProductItemKind, ProductKind } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { assertProductThumbnailUrl } from "@/lib/media/product-image";
import {
  createProduct,
  productInclude,
  updateProduct,
  updateProductItems,
} from "@/lib/products";
import {
  assignProductGroup,
  listCoachProductGroups,
  parseProductGroupAssignment,
  type ProductGroupAssignment,
} from "@/lib/product-groups";
import { prisma } from "@/lib/prisma";

type ProductItemInput = {
  kind: ProductItemKind;
  courseId?: string;
  coachingOfferingId?: string;
  sortOrder?: number;
  accessDuration?: "LIFETIME" | "FIXED_DAYS";
  accessDays?: number | null;
};

export { productInclude, productKindLabels, getProductDisplayPrice } from "@/lib/products";

function productBelongsToCoach(
  product: {
    items: Array<{
      courseId: string | null;
      coachingOfferingId: string | null;
      course: { instructorId: string } | null;
      coachingOffering: { coachId: string | null } | null;
    }>;
  },
  coachId: string,
) {
  if (product.items.length === 0) return false;

  return product.items.every((item) => {
    if (item.courseId) {
      return item.course?.instructorId === coachId;
    }
    if (item.coachingOfferingId) {
      return item.coachingOffering?.coachId === coachId;
    }
    return false;
  });
}

const coachProductListInclude = {
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      course: {
        select: { id: true, title: true, status: true, instructorId: true },
      },
      coachingOffering: {
        select: {
          id: true,
          slug: true,
          title: true,
          totalSessions: true,
          isActive: true,
          coachId: true,
        },
      },
    },
  },
  organization: { select: { id: true, name: true, slug: true } },
  groupMember: { include: { group: { select: { id: true, title: true } } } },
  _count: { select: { orderLines: true } },
} as const;

export async function assertCoachOwnsProduct(coachId: string, productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      ...productInclude,
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          course: { select: { id: true, instructorId: true, title: true, status: true } },
          coachingOffering: {
            select: {
              id: true,
              coachId: true,
              slug: true,
              title: true,
              totalSessions: true,
              isActive: true,
            },
          },
        },
      },
      groupMember: { include: { group: { select: { id: true, title: true } } } },
    },
  });

  if (!product) {
    throw new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  if (!productBelongsToCoach(product, coachId)) {
    throw new ApiError("Product access denied", 403, "FORBIDDEN");
  }

  return product;
}

async function validateCoachProductItems(coachId: string, items: ProductItemInput[]) {
  for (const item of items) {
    if (item.kind === "COURSE_ACCESS" && item.courseId) {
      const course = await prisma.course.findUnique({ where: { id: item.courseId } });
      if (!course || course.instructorId !== coachId) {
        throw new ApiError("Course access denied", 403, "FORBIDDEN");
      }
    }
    if (item.kind === "COACHING_ACCESS" && item.coachingOfferingId) {
      const offering = await prisma.coachingOffering.findUnique({
        where: { id: item.coachingOfferingId },
      });
      if (!offering || offering.coachId !== coachId) {
        throw new ApiError("Coaching offering access denied", 403, "FORBIDDEN");
      }
    }
  }
}

export async function listCoachProducts(coachId: string) {
  const products = await prisma.product.findMany({
    include: coachProductListInclude,
    orderBy: { updatedAt: "desc" },
  });

  return products.filter((product) => productBelongsToCoach(product, coachId));
}

async function coachOwnedProductIds(coachId: string) {
  const products = await listCoachProducts(coachId);
  return products.map((product) => product.id);
}

export async function createCoachProduct(params: {
  coachId: string;
  title: string;
  description?: string;
  descriptionMetadata?: Prisma.InputJsonValue | null;
  supplies?: string[];
  kind: ProductKind;
  listPrice: number;
  salePrice?: number;
  items: ProductItemInput[];
  activate?: boolean;
  group?: ProductGroupAssignment;
}) {
  await validateCoachProductItems(params.coachId, params.items);

  const product = await createProduct({
    actorId: params.coachId,
    title: params.title,
    description: params.description,
    descriptionMetadata: params.descriptionMetadata,
    supplies: params.supplies,
    kind: params.kind,
    listPrice: params.listPrice,
    salePrice: params.salePrice,
    items: params.items,
    activate: params.activate,
  });

  if (!params.group || params.group.mode === "none") {
    return product;
  }

  try {
    const ownedProductIds = await coachOwnedProductIds(params.coachId);
    await assignProductGroup({
      productId: product.id,
      ownedProductIds,
      assignment: params.group,
    });
  } catch (error) {
    await prisma.product.delete({ where: { id: product.id } }).catch(() => undefined);
    throw error;
  }

  return assertCoachOwnsProduct(params.coachId, product.id);
}

export async function updateCoachProduct(params: {
  coachId: string;
  productId: string;
  title?: string;
  description?: string;
  descriptionMetadata?: Prisma.InputJsonValue | null;
  supplies?: string[];
  listPrice?: number;
  salePrice?: number | null;
  thumbnailUrl?: string | null;
  isActive?: boolean;
  group?: ProductGroupAssignment;
}) {
  await assertCoachOwnsProduct(params.coachId, params.productId);

  const thumbnailUrl =
    params.thumbnailUrl === undefined
      ? undefined
      : assertProductThumbnailUrl(params.productId, params.thumbnailUrl);

  const product = await updateProduct({
    actorId: params.coachId,
    productId: params.productId,
    title: params.title,
    description: params.description,
    descriptionMetadata: params.descriptionMetadata,
    supplies: params.supplies,
    listPrice: params.listPrice,
    salePrice: params.salePrice,
    thumbnailUrl,
    isActive: params.isActive,
  });

  if (params.group) {
    const ownedProductIds = await coachOwnedProductIds(params.coachId);
    await assignProductGroup({
      productId: params.productId,
      ownedProductIds,
      assignment: params.group,
    });
  }

  return product;
}

export async function updateCoachProductItems(params: {
  coachId: string;
  productId: string;
  items: ProductItemInput[];
}) {
  await assertCoachOwnsProduct(params.coachId, params.productId);
  await validateCoachProductItems(params.coachId, params.items);

  return updateProductItems({
    actorId: params.coachId,
    productId: params.productId,
    items: params.items,
  });
}

export async function getCoachProductCatalog(coachId: string) {
  const [courses, offerings] = await Promise.all([
    prisma.course.findMany({
      where: { instructorId: coachId },
      select: { id: true, title: true, status: true },
      orderBy: { title: "asc" },
    }),
    prisma.coachingOffering.findMany({
      where: { coachId },
      select: { id: true, title: true, slug: true, isActive: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const ownedProductIds = await coachOwnedProductIds(coachId);

  return {
    courses: courses.map((course) => ({
      id: course.id,
      label: `${course.title}${course.status !== "PUBLISHED" ? " (미발행)" : ""}`,
    })),
    offerings: offerings.map((offering) => ({
      id: offering.id,
      label: offering.title,
    })),
    groups: await listCoachProductGroups(ownedProductIds),
  };
}

export { parseProductGroupAssignment };
