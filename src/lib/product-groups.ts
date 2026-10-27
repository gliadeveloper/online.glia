import "server-only";

import { cache } from "react";

import { Prisma } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { formatProductPrice, getProductDisplayPrice } from "@/lib/customer-labels";
import { prisma } from "@/lib/prisma";
import { getActiveProducts, type CatalogProduct } from "@/lib/shop-products";

const labelMax = 40;
const titleMax = 120;

export type ProductGroupAssignment =
  | { mode: "none" }
  | { mode: "new"; title: string; label: string }
  | { mode: "existing"; groupId: string; label: string };

export type CoachProductGroupOption = {
  id: string;
  title: string;
};

export type ShopProductOption = {
  productId: string;
  label: string;
  price: number;
};

export type ShopProductGroup = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  options: ShopProductOption[];
};

export type ShopListing =
  | { kind: "product"; product: CatalogProduct }
  | {
      kind: "group";
      id: string;
      title: string;
      description: string | null;
      thumbnailUrl: string | null;
      href: string;
      priceLabel: string;
      optionLabels: string[];
      coverProduct: CatalogProduct;
    };

function cleanLabel(label: string) {
  const value = label.trim();
  if (!value || value.length > labelMax) {
    throw new ApiError("옵션 이름을 40자 안으로 입력해 주세요.", 400, "VALIDATION_ERROR");
  }
  return value;
}

function cleanTitle(title: string) {
  const value = title.trim();
  if (!value || value.length > titleMax) {
    throw new ApiError("그룹 제목을 120자 안으로 입력해 주세요.", 400, "VALIDATION_ERROR");
  }
  return value;
}

export function parseProductGroupAssignment(value: unknown): ProductGroupAssignment | undefined {
  if (value === undefined) return undefined;
  if (value === null) return { mode: "none" };
  if (!value || typeof value !== "object") {
    throw new ApiError("그룹 정보가 올바르지 않습니다.", 400, "VALIDATION_ERROR");
  }

  const body = value as { mode?: string; title?: string; label?: string; groupId?: string };
  if (body.mode === "none") return { mode: "none" };
  if (body.mode === "new") {
    return { mode: "new", title: body.title ?? "", label: body.label ?? "" };
  }
  if (body.mode === "existing") {
    return { mode: "existing", groupId: body.groupId?.trim() ?? "", label: body.label ?? "" };
  }

  throw new ApiError("그룹 정보가 올바르지 않습니다.", 400, "VALIDATION_ERROR");
}

async function deleteGroupIfEmpty(tx: Prisma.TransactionClient, groupId: string) {
  const left = await tx.productGroupMember.count({ where: { groupId } });
  if (left === 0) {
    await tx.productGroup.delete({ where: { id: groupId } });
  }
}

export async function listCoachProductGroups(ownedProductIds: string[]): Promise<CoachProductGroupOption[]> {
  if (ownedProductIds.length === 0) return [];

  const owned = new Set(ownedProductIds);
  const groups = await prisma.productGroup.findMany({
    where: { members: { some: { productId: { in: ownedProductIds } } } },
    include: { members: { select: { productId: true } } },
    orderBy: { title: "asc" },
  });

  return groups
    .filter((group) => group.members.every((member) => owned.has(member.productId)))
    .map((group) => ({ id: group.id, title: group.title }));
}

export async function assignProductGroup(params: {
  productId: string;
  ownedProductIds: string[];
  assignment: ProductGroupAssignment;
}) {
  if (!params.ownedProductIds.includes(params.productId)) {
    throw new ApiError("Product access denied", 403, "FORBIDDEN");
  }

  const owned = new Set(params.ownedProductIds);

  try {
    await prisma.$transaction(async (tx) => {
      const previous = await tx.productGroupMember.findUnique({
        where: { productId: params.productId },
      });

      if (params.assignment.mode === "none") {
        if (!previous) return;
        await tx.productGroupMember.delete({ where: { productId: params.productId } });
        await deleteGroupIfEmpty(tx, previous.groupId);
        return;
      }

      const label = cleanLabel(params.assignment.label);
      let groupId: string;

      if (params.assignment.mode === "new") {
        const created = await tx.productGroup.create({
          data: {
            title: cleanTitle(params.assignment.title),
            isActive: true,
            publishedAt: new Date(),
          },
        });
        groupId = created.id;
      } else {
        groupId = params.assignment.groupId.trim();
        if (!groupId) {
          throw new ApiError("그룹을 선택해 주세요.", 400, "VALIDATION_ERROR");
        }

        const group = await tx.productGroup.findUnique({
          where: { id: groupId },
          include: { members: { select: { productId: true } } },
        });
        if (!group) {
          throw new ApiError("그룹을 찾을 수 없습니다.", 404, "PRODUCT_GROUP_NOT_FOUND");
        }
        if (group.members.some((member) => !owned.has(member.productId))) {
          throw new ApiError("Product access denied", 403, "FORBIDDEN");
        }
      }

      const sortOrder =
        previous?.groupId === groupId
          ? previous.sortOrder
          : await tx.productGroupMember.count({
              where: { groupId, productId: { not: params.productId } },
            });

      if (previous && previous.groupId !== groupId) {
        await tx.productGroupMember.delete({ where: { productId: params.productId } });
        await deleteGroupIfEmpty(tx, previous.groupId);
      }

      await tx.productGroupMember.upsert({
        where: { productId: params.productId },
        create: {
          groupId,
          productId: params.productId,
          label,
          sortOrder,
        },
        update: { groupId, label, sortOrder },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError("이 그룹에 같은 옵션 이름이 있습니다.", 409, "PRODUCT_GROUP_LABEL_TAKEN");
    }
    throw error;
  }
}

export const getActiveProductGroup = cache(async (productId: string): Promise<ShopProductGroup | null> => {
  const member = await prisma.productGroupMember.findFirst({
    where: { productId, group: { isActive: true }, product: { isActive: true } },
    include: {
      group: {
        include: {
          members: {
            orderBy: { sortOrder: "asc" },
            include: {
              product: {
                select: { id: true, listPrice: true, salePrice: true, isActive: true, thumbnailUrl: true },
              },
            },
          },
        },
      },
    },
  });

  if (!member) return null;

  const options = member.group.members
    .filter((row) => row.product.isActive)
    .map((row) => ({
      productId: row.product.id,
      label: row.label,
      price: getProductDisplayPrice(row.product),
    }));

  if (options.length < 2) return null;

  return {
    id: member.group.id,
    title: member.group.title,
    description: member.group.description,
    thumbnailUrl: member.group.thumbnailUrl,
    options,
  };
});

function formatGroupPrice(prices: number[]) {
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const minLabel = formatProductPrice(min);
  return min === max ? minLabel : `${minLabel}부터`;
}

export async function getShopListings(limit?: number): Promise<ShopListing[]> {
  const products = await getActiveProducts();
  const productIds = products.map((product) => product.id);
  const memberships =
    productIds.length === 0
      ? []
      : await prisma.productGroupMember.findMany({
          where: { productId: { in: productIds }, group: { isActive: true } },
          orderBy: { sortOrder: "asc" },
          include: {
            group: {
              select: { id: true, title: true, description: true, thumbnailUrl: true },
            },
          },
        });

  const byProductId = new Map(products.map((product) => [product.id, product]));
  const groupedIds = new Set<string>();
  const buckets = new Map<
    string,
    { group: (typeof memberships)[number]["group"]; rows: typeof memberships }
  >();

  for (const membership of memberships) {
    const bucket = buckets.get(membership.groupId) ?? { group: membership.group, rows: [] };
    bucket.rows.push(membership);
    buckets.set(membership.groupId, bucket);
  }

  const listings: ShopListing[] = [];

  for (const bucket of buckets.values()) {
    const members = bucket.rows
      .map((row) => {
        const product = byProductId.get(row.productId);
        return product ? { label: row.label, product } : null;
      })
      .filter((row): row is { label: string; product: CatalogProduct } => row != null);

    if (members.length < 2) continue;

    for (const member of members) groupedIds.add(member.product.id);

    const cover = members[0]?.product;
    if (!cover) continue;
    const prices = members.map((member) => getProductDisplayPrice(member.product));

    listings.push({
      kind: "group",
      id: bucket.group.id,
      title: bucket.group.title,
      description: bucket.group.description,
      thumbnailUrl: bucket.group.thumbnailUrl ?? cover.thumbnailUrl,
      href: `/shop/${cover.id}`,
      priceLabel: formatGroupPrice(prices),
      optionLabels: members.map((member) => member.label),
      coverProduct: cover,
    });
  }

  for (const product of products) {
    if (!groupedIds.has(product.id)) {
      listings.push({ kind: "product", product });
    }
  }

  listings.sort((a, b) => {
    const aBundle = a.kind === "group" ? a.coverProduct.kind === "BUNDLE" : a.product.kind === "BUNDLE";
    const bBundle = b.kind === "group" ? b.coverProduct.kind === "BUNDLE" : b.product.kind === "BUNDLE";
    if (aBundle !== bBundle) return aBundle ? -1 : 1;
    const aTitle = a.kind === "group" ? a.title : a.product.title;
    const bTitle = b.kind === "group" ? b.title : b.product.title;
    return aTitle.localeCompare(bTitle, "ko");
  });

  return limit ? listings.slice(0, limit) : listings;
}
