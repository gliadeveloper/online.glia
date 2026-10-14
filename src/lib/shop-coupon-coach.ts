import "server-only";

import { ApiError } from "@/lib/api";
import { listCoachProducts } from "@/lib/coach-commerce";
import { prisma } from "@/lib/prisma";
import {
  createShopCoupon,
  updateShopCoupon,
  type ShopCouponWriteInput,
} from "@/lib/shop-coupon-admin";

async function ownedProductIds(coachId: string) {
  const products = await listCoachProducts(coachId);
  return new Set(products.map((product) => product.id));
}

/** Rejects product ids the coach does not own. Missing products fail the same way. */
export async function assertCoachCouponProducts(coachId: string, productIds: string[]) {
  const owned = await ownedProductIds(coachId);
  if (productIds.some((productId) => !owned.has(productId))) {
    throw new ApiError("본인 상품만 쿠폰에 연결할 수 있습니다.", 403, "COUPON_PRODUCT_FORBIDDEN");
  }
}

export async function listCoachCouponProducts(coachId: string, activeOnly: boolean) {
  const products = await listCoachProducts(coachId);
  return products
    .filter((product) => !activeOnly || product.isActive)
    .map((product) => ({ id: product.id, title: product.title }))
    .sort((left, right) => left.title.localeCompare(right.title, "ko"));
}

export async function listCoachShopCoupons(coachId: string) {
  const productIds = [...(await ownedProductIds(coachId))];
  if (productIds.length === 0) return [];

  return prisma.shopCoupon.findMany({
    where: {
      AND: [
        { products: { some: { productId: { in: productIds } } } },
        { products: { every: { productId: { in: productIds } } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      products: { include: { product: { select: { title: true } } } },
      _count: { select: { issues: true } },
    },
  });
}

/** Coupons linked to another coach's product are hidden, including mixed-product coupons. */
export async function getCoachManagedCoupon(coachId: string, couponId: string) {
  const coupon = await prisma.shopCoupon.findUnique({
    where: { id: couponId },
    include: { products: { select: { productId: true } } },
  });
  if (!coupon || coupon.products.length === 0) return null;

  const owned = await ownedProductIds(coachId);
  if (coupon.products.some((item) => !owned.has(item.productId))) return null;
  return coupon;
}

export async function createCoachShopCoupon(coachId: string, input: ShopCouponWriteInput) {
  await assertCoachCouponProducts(coachId, input.productIds);
  return createShopCoupon(coachId, input);
}

export async function updateCoachShopCoupon(coachId: string, couponId: string, input: ShopCouponWriteInput) {
  const current = await getCoachManagedCoupon(coachId, couponId);
  if (!current) throw new ApiError("쿠폰을 찾을 수 없습니다.", 404, "COUPON_NOT_FOUND");
  await assertCoachCouponProducts(coachId, input.productIds);
  return updateShopCoupon(coachId, couponId, input);
}
