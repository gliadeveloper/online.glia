import "server-only";

import { Prisma, type ShopCouponDiscountType, type ShopCouponValidityKind } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { normalizeCouponCode } from "@/lib/shop-coupon-math";
import { parseKstDateTimeLocal } from "@/lib/shop-coupon-time";

export type ShopCouponWriteInput = {
  name: string;
  discountType: ShopCouponDiscountType;
  discountAmount: number | null;
  discountPercent: number | null;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  issueStartsAt: Date;
  issueEndsAt: Date;
  validityKind: ShopCouponValidityKind;
  validStartsAt: Date | null;
  validEndsAt: Date | null;
  validDays: number | null;
  issueLimit: number | null;
  productIds: string[];
  isActive: boolean;
  isPublic: boolean;
  code: string | null;
};

function readInt(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) return null;
  return value;
}

function readOptionalInt(value: unknown) {
  if (value == null || value === "") return null;
  return readInt(value);
}

export function parseShopCouponWrite(body: Record<string, unknown>): ShopCouponWriteInput {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 40) {
    throw new ApiError("쿠폰명은 1–40자로 입력해 주세요.", 400, "COUPON_NAME_INVALID");
  }

  const discountType = body.discountType === "PERCENT" ? "PERCENT" : body.discountType === "FIXED" ? "FIXED" : null;
  if (!discountType) throw new ApiError("할인 방식을 선택해 주세요.", 400, "COUPON_DISCOUNT_INVALID");

  const discountAmount = readOptionalInt(body.discountAmount);
  const discountPercent = readOptionalInt(body.discountPercent);
  const maxDiscountAmount = readOptionalInt(body.maxDiscountAmount);
  const minOrderAmount = readInt(body.minOrderAmount) ?? 0;
  if (minOrderAmount < 0) throw new ApiError("최소 결제 금액을 확인해 주세요.", 400, "COUPON_MIN_INVALID");

  if (discountType === "FIXED") {
    if (discountAmount == null || discountAmount < 1) {
      throw new ApiError("할인 금액을 입력해 주세요.", 400, "COUPON_AMOUNT_INVALID");
    }
  } else if (discountPercent == null || discountPercent < 1 || discountPercent > 100) {
    throw new ApiError("할인율은 1–100 사이로 입력해 주세요.", 400, "COUPON_PERCENT_INVALID");
  } else if (maxDiscountAmount != null && maxDiscountAmount < 1) {
    throw new ApiError("최대 할인 금액을 확인해 주세요.", 400, "COUPON_CAP_INVALID");
  }

  const issueStartsAt = typeof body.issueStartsAt === "string" ? parseKstDateTimeLocal(body.issueStartsAt) : null;
  const issueEndsAt = typeof body.issueEndsAt === "string" ? parseKstDateTimeLocal(body.issueEndsAt) : null;
  if (!issueStartsAt || !issueEndsAt || issueStartsAt >= issueEndsAt) {
    throw new ApiError("발급 기간을 확인해 주세요.", 400, "COUPON_ISSUE_WINDOW_INVALID");
  }

  const validityKind =
    body.validityKind === "DAYS_FROM_ISSUE" ? "DAYS_FROM_ISSUE" : body.validityKind === "RANGE" ? "RANGE" : null;
  if (!validityKind) throw new ApiError("사용 기간 방식을 선택해 주세요.", 400, "COUPON_VALIDITY_INVALID");

  let validStartsAt: Date | null = null;
  let validEndsAt: Date | null = null;
  let validDays: number | null = null;
  if (validityKind === "RANGE") {
    validStartsAt = typeof body.validStartsAt === "string" ? parseKstDateTimeLocal(body.validStartsAt) : null;
    validEndsAt = typeof body.validEndsAt === "string" ? parseKstDateTimeLocal(body.validEndsAt) : null;
    if (!validStartsAt || !validEndsAt || validStartsAt >= validEndsAt) {
      throw new ApiError("사용 기간을 확인해 주세요.", 400, "COUPON_VALID_RANGE_INVALID");
    }
  } else {
    validDays = readInt(body.validDays);
    if (validDays == null || validDays < 1 || validDays > 365) {
      throw new ApiError("사용 일수는 1–365일로 입력해 주세요.", 400, "COUPON_VALID_DAYS_INVALID");
    }
  }

  const issueLimit = readOptionalInt(body.issueLimit);
  if (issueLimit != null && (issueLimit < 1 || issueLimit > 1_000_000)) {
    throw new ApiError("발급 수량을 확인해 주세요.", 400, "COUPON_LIMIT_INVALID");
  }

  const productIds = Array.isArray(body.productIds)
    ? [...new Set(body.productIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0))]
    : [];
  if (productIds.length < 1 || productIds.length > 100) {
    throw new ApiError("쿠폰을 쓸 상품을 선택해 주세요.", 400, "COUPON_PRODUCTS_REQUIRED");
  }

  const isPublic = body.isPublic !== false;
  const code = readCouponCode(body.code, isPublic);

  return {
    name,
    discountType,
    discountAmount: discountType === "FIXED" ? discountAmount : null,
    discountPercent: discountType === "PERCENT" ? discountPercent : null,
    maxDiscountAmount: discountType === "PERCENT" ? maxDiscountAmount : null,
    minOrderAmount,
    issueStartsAt,
    issueEndsAt,
    validityKind,
    validStartsAt,
    validEndsAt,
    validDays,
    issueLimit,
    productIds,
    isActive: body.isActive !== false,
    isPublic,
    code,
  };
}

function readCouponCode(value: unknown, isPublic: boolean) {
  const code = normalizeCouponCode(typeof value === "string" ? value : "");
  if (!code) {
    if (!isPublic) throw new ApiError("비공개 쿠폰은 쿠폰 번호가 필요합니다.", 400, "COUPON_CODE_REQUIRED");
    return null;
  }
  if (!/^[A-Z0-9]{4,20}$/.test(code)) {
    throw new ApiError("쿠폰 번호는 영문과 숫자 4~20자로 적어 주세요.", 400, "COUPON_CODE_INVALID");
  }
  return code;
}

function rethrowCouponWrite(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ApiError("이미 쓰는 쿠폰 번호입니다.", 409, "COUPON_CODE_TAKEN");
  }
  throw error;
}

async function assertProducts(productIds: string[]) {
  const found = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true },
  });
  if (found.length !== productIds.length) {
    throw new ApiError("상품을 확인해 주세요.", 400, "COUPON_PRODUCT_NOT_FOUND");
  }
}

function couponData(input: ShopCouponWriteInput): Prisma.ShopCouponCreateInput {
  return {
    name: input.name,
    discountType: input.discountType,
    discountAmount: input.discountAmount,
    discountPercent: input.discountPercent,
    maxDiscountAmount: input.maxDiscountAmount,
    minOrderAmount: input.minOrderAmount,
    issueStartsAt: input.issueStartsAt,
    issueEndsAt: input.issueEndsAt,
    validityKind: input.validityKind,
    validStartsAt: input.validStartsAt,
    validEndsAt: input.validEndsAt,
    validDays: input.validDays,
    issueLimit: input.issueLimit,
    isActive: input.isActive,
    isPublic: input.isPublic,
    code: input.code,
    products: { create: input.productIds.map((productId) => ({ productId })) },
  };
}

export async function createShopCoupon(actorId: string, input: ShopCouponWriteInput) {
  await assertProducts(input.productIds);
  const coupon = await prisma.shopCoupon.create({ data: couponData(input) }).catch(rethrowCouponWrite);
  await writeAuditLog({
    actorId,
    entityType: "ShopCoupon",
    entityId: coupon.id,
    action: "COUPON_CREATED",
    metadata: { name: coupon.name, productIds: input.productIds },
  });
  return coupon;
}

export async function updateShopCoupon(actorId: string, couponId: string, input: ShopCouponWriteInput) {
  const current = await prisma.shopCoupon.findUnique({ where: { id: couponId } });
  if (!current) throw new ApiError("쿠폰을 찾을 수 없습니다.", 404, "COUPON_NOT_FOUND");
  if (input.issueLimit != null && input.issueLimit < current.issuedCount) {
    throw new ApiError("발급 수량은 이미 받은 수보다 작을 수 없습니다.", 400, "COUPON_LIMIT_TOO_SMALL");
  }
  await assertProducts(input.productIds);

  const coupon = await prisma.$transaction(async (tx) => {
    await tx.shopCouponProduct.deleteMany({ where: { couponId } });
    return tx.shopCoupon.update({
      where: { id: couponId },
      data: {
        name: input.name,
        discountType: input.discountType,
        discountAmount: input.discountAmount,
        discountPercent: input.discountPercent,
        maxDiscountAmount: input.maxDiscountAmount,
        minOrderAmount: input.minOrderAmount,
        issueStartsAt: input.issueStartsAt,
        issueEndsAt: input.issueEndsAt,
        validityKind: input.validityKind,
        validStartsAt: input.validStartsAt,
        validEndsAt: input.validEndsAt,
        validDays: input.validDays,
        issueLimit: input.issueLimit,
        isActive: input.isActive,
        isPublic: input.isPublic,
        code: input.code,
        products: { create: input.productIds.map((productId) => ({ productId })) },
      },
    });
  }).catch(rethrowCouponWrite);

  await writeAuditLog({
    actorId,
    entityType: "ShopCoupon",
    entityId: coupon.id,
    action: "COUPON_UPDATED",
    metadata: { name: coupon.name, isActive: coupon.isActive },
  });
  return coupon;
}
