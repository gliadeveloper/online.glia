import "server-only";

import { Prisma, type ShopCoupon, type ShopCouponIssue, type ShopCouponIssueStatus } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { TOSS_PROVIDER, preparedTossProviderRef } from "@/lib/payments/toss/verify";
import { prisma } from "@/lib/prisma";
import {
  couponDiscountWon,
  formatCouponBenefit,
  formatCouponCondition,
  normalizeCouponCode,
  type CouponDiscountRule,
} from "@/lib/shop-coupon-math";
import { formatKstDate } from "@/lib/shop-coupon-time";

export type ProductCouponCard = {
  id: string;
  name: string;
  benefitLabel: string;
  conditionLabel: string;
  periodLabel: string;
  discountWon: number;
  downloadState: "ready" | "owned" | "login";
};

export type CheckoutCouponOption = {
  issueId: string;
  name: string;
  benefitLabel: string;
  conditionLabel: string;
  periodLabel: string;
  discountWon: number;
};

export type ShopCouponOffer = {
  cards: ProductCouponCard[];
  checkoutOptions: CheckoutCouponOption[];
};

type CouponWithIssues = ShopCoupon & { issues: ShopCouponIssue[] };

function periodLabel(coupon: ShopCoupon, issue: ShopCouponIssue | undefined) {
  if (issue) return `${formatKstDate(issue.expiresAt)}까지`;
  if (coupon.validityKind === "DAYS_FROM_ISSUE") return `받은 날부터 ${coupon.validDays ?? 0}일`;
  if (coupon.validStartsAt && coupon.validEndsAt) {
    return `${formatKstDate(coupon.validStartsAt)} – ${formatKstDate(coupon.validEndsAt)}`;
  }
  return "";
}

function ruleOf(source: CouponDiscountRule): CouponDiscountRule {
  return {
    discountType: source.discountType,
    discountAmount: source.discountAmount,
    discountPercent: source.discountPercent,
    maxDiscountAmount: source.maxDiscountAmount,
    minOrderAmount: source.minOrderAmount,
  };
}

function expiryFor(coupon: ShopCoupon, issuedAt: Date) {
  if (coupon.validityKind === "DAYS_FROM_ISSUE") {
    const days = coupon.validDays ?? 0;
    return {
      validStartsAt: issuedAt,
      expiresAt: new Date(issuedAt.getTime() + days * 24 * 60 * 60 * 1000),
    };
  }
  return {
    validStartsAt: coupon.validStartsAt ?? issuedAt,
    expiresAt: coupon.validEndsAt ?? issuedAt,
  };
}

export async function getShopCouponOffer(
  productId: string,
  userId: string | null,
  price: number,
  now = new Date(),
): Promise<ShopCouponOffer> {
  if (price < 1) {
    return { cards: [], checkoutOptions: [] };
  }

  const openStatuses: ShopCouponIssueStatus[] = ["ISSUED", "RESERVED"];
  const coupons = await prisma.shopCoupon.findMany({
    where: {
      products: { some: { productId } },
      OR: [
        { isActive: true, issueStartsAt: { lte: now }, issueEndsAt: { gt: now } },
        ...(userId
          ? [
              {
                issues: {
                  some: {
                    userId,
                    status: { in: openStatuses },
                    expiresAt: { gt: now },
                  },
                },
              },
            ]
          : []),
      ],
    },
    include: {
      issues: { where: { userId: userId ?? "__none__" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const cards: ProductCouponCard[] = [];
  const checkoutOptions: CheckoutCouponOption[] = [];

  for (const coupon of coupons) {
    const issue = coupon.issues[0];
    if (issue?.status === "USED") continue;
    const owned =
      issue != null &&
      (issue.status === "ISSUED" || issue.status === "RESERVED") &&
      issue.expiresAt > now;
    if (issue && !owned) continue;
    const inWindow = coupon.isActive && coupon.issueStartsAt <= now && coupon.issueEndsAt > now;
    const exhausted = coupon.issueLimit != null && coupon.issuedCount >= coupon.issueLimit;
    if (!owned && (!inWindow || exhausted)) continue;
    if (!coupon.isPublic && !owned) continue;

    const quoteSource = owned ? issue : coupon;
    const discountWon = couponDiscountWon(ruleOf(quoteSource), price);
    const card: ProductCouponCard = {
      id: coupon.id,
      name: coupon.name,
      benefitLabel: formatCouponBenefit(ruleOf(owned ? issue : coupon)),
      conditionLabel: formatCouponCondition((owned ? issue : coupon).minOrderAmount),
      periodLabel: periodLabel(coupon, owned ? issue : undefined),
      discountWon,
      downloadState: owned ? "owned" : userId ? "ready" : "login",
    };
    if (coupon.isPublic) cards.push(card);

    if (
      userId &&
      owned &&
      issue.validStartsAt <= now &&
      discountWon >= 1
    ) {
      checkoutOptions.push({
        issueId: issue.id,
        name: coupon.name,
        benefitLabel: card.benefitLabel,
        conditionLabel: card.conditionLabel,
        periodLabel: card.periodLabel,
        discountWon,
      });
    }
  }

  cards.sort((left, right) => right.discountWon - left.discountWon || left.name.localeCompare(right.name, "ko"));
  checkoutOptions.sort((left, right) => right.discountWon - left.discountWon || left.name.localeCompare(right.name, "ko"));
  return { cards, checkoutOptions };
}

async function issueOne(
  tx: Prisma.TransactionClient,
  userId: string,
  productId: string,
  couponId: string,
  now: Date,
  access: "download" | "code",
) {
  const coupon = await tx.shopCoupon.findFirst({
    where: { id: couponId, isActive: true, products: { some: { productId } } },
  });
  if (!coupon) throw new ApiError("받을 수 있는 쿠폰이 없습니다.", 404, "COUPON_NOT_FOUND");
  if (access === "download" && !coupon.isPublic) {
    throw new ApiError("상품 상세에서 받을 수 없는 쿠폰입니다.", 400, "COUPON_PRIVATE");
  }
  if (coupon.issueStartsAt > now || coupon.issueEndsAt <= now) {
    throw new ApiError("쿠폰 발급 기간이 아닙니다.", 400, "COUPON_ISSUE_CLOSED");
  }

  const existing = await tx.shopCouponIssue.findUnique({
    where: { couponId_userId: { couponId, userId } },
  });
  if (existing) return;

  const claimed = await tx.shopCoupon.updateMany({
    where: {
      id: coupon.id,
      isActive: true,
      issueStartsAt: { lte: now },
      issueEndsAt: { gt: now },
      ...(coupon.issueLimit == null ? {} : { issuedCount: { lt: coupon.issueLimit } }),
    },
    data: { issuedCount: { increment: 1 } },
  });
  if (claimed.count !== 1) throw new ApiError("쿠폰이 모두 소진되었습니다.", 409, "COUPON_EXHAUSTED");

  const window = expiryFor(coupon, now);
  await tx.shopCouponIssue.create({
    data: {
      couponId: coupon.id,
      userId,
      status: "ISSUED",
      discountType: coupon.discountType,
      discountAmount: coupon.discountAmount,
      discountPercent: coupon.discountPercent,
      maxDiscountAmount: coupon.maxDiscountAmount,
      minOrderAmount: coupon.minOrderAmount,
      validStartsAt: window.validStartsAt,
      expiresAt: window.expiresAt,
      issuedAt: now,
    },
  });
}

export async function downloadShopCoupons(userId: string, productId: string, couponIds: string[]) {
  const uniqueIds = [...new Set(couponIds.map((id) => id.trim()).filter(Boolean))].slice(0, 20);
  if (uniqueIds.length === 0) throw new ApiError("받을 쿠폰을 선택해 주세요.", 400, "COUPON_REQUIRED");

  const now = new Date();
  let message: string | null = null;
  for (const couponId of uniqueIds) {
    try {
      await prisma.$transaction((tx) => issueOne(tx, userId, productId, couponId, now, "download"));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      if (error instanceof ApiError && message == null) message = error.message;
    }
  }
  return message;
}

export async function redeemShopCouponCode(userId: string, productId: string, rawCode: string, price: number) {
  const code = normalizeCouponCode(rawCode);
  if (!/^[A-Z0-9]{4,20}$/.test(code)) {
    throw new ApiError("쿠폰 번호를 확인해 주세요.", 400, "COUPON_CODE_INVALID");
  }

  const coupon = await prisma.shopCoupon.findUnique({
    where: { code },
    include: { products: { select: { productId: true } } },
  });
  if (!coupon || !coupon.isActive) {
    throw new ApiError("쿠폰 번호를 확인해 주세요.", 400, "COUPON_CODE_INVALID");
  }
  if (!coupon.products.some((item) => item.productId === productId)) {
    throw new ApiError("이 상품에는 쓸 수 없는 쿠폰 번호입니다.", 400, "COUPON_PRODUCT_MISMATCH");
  }

  const now = new Date();
  const existing = await prisma.shopCouponIssue.findUnique({
    where: { couponId_userId: { couponId: coupon.id, userId } },
  });
  if (existing?.status === "USED" || (existing != null && existing.expiresAt <= now)) {
    throw new ApiError("이미 사용했거나 기간이 지난 쿠폰입니다.", 400, "COUPON_UNUSABLE");
  }
  if (!existing) {
    try {
      await prisma.$transaction((tx) => issueOne(tx, userId, productId, coupon.id, now, "code"));
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
  }

  const issue =
    existing ??
    (await prisma.shopCouponIssue.findUnique({
      where: { couponId_userId: { couponId: coupon.id, userId } },
    }));
  if (!issue || issue.status === "USED" || issue.expiresAt <= now) {
    throw new ApiError("쿠폰을 받지 못했습니다.", 400, "COUPON_ISSUE_FAILED");
  }
  if (issue.validStartsAt > now) {
    throw new ApiError("아직 사용할 수 없는 쿠폰입니다.", 400, "COUPON_NOT_YET");
  }

  const discountWon = couponDiscountWon(ruleOf(issue), price);
  if (discountWon < 1) throw new ApiError("이 금액에는 쿠폰을 쓸 수 없습니다.", 400, "COUPON_MIN_AMOUNT");

  const option: CheckoutCouponOption = {
    issueId: issue.id,
    name: coupon.name,
    benefitLabel: formatCouponBenefit(ruleOf(issue)),
    conditionLabel: formatCouponCondition(issue.minOrderAmount),
    periodLabel: periodLabel(coupon, issue),
    discountWon,
  };
  return { alreadyOwned: existing != null, option };
}

type CouponLock =
  | { kind: "reuse"; orderId: string; total: number }
  | { kind: "locked"; discount: number; total: number };

/**
 * Reserves a downloaded coupon for a new Toss order.
 * A pending prepared order with the same price is reused. A stale prepared order is cancelled first.
 */
export async function lockCouponForOrder(
  tx: Prisma.TransactionClient,
  params: { userId: string; productId: string; couponIssueId: string; price: number; now: Date },
): Promise<CouponLock> {
  const issue = await tx.shopCouponIssue.findFirst({
    where: {
      id: params.couponIssueId,
      userId: params.userId,
      status: { in: ["ISSUED", "RESERVED"] },
    },
    include: { coupon: { include: { products: { select: { productId: true } } } } },
  });
  if (!issue) throw new ApiError("쿠폰을 사용할 수 없습니다.", 400, "COUPON_UNAVAILABLE");
  if (!issue.coupon.products.some((product) => product.productId === params.productId)) {
    throw new ApiError("이 상품에 쓸 수 없는 쿠폰입니다.", 400, "COUPON_PRODUCT_MISMATCH");
  }
  if (issue.validStartsAt > params.now || issue.expiresAt <= params.now) {
    throw new ApiError("쿠폰 사용 기간이 아닙니다.", 400, "COUPON_EXPIRED");
  }

  const discount = couponDiscountWon(ruleOf(issue), params.price);
  if (discount < 1) throw new ApiError("이 금액에는 쿠폰을 쓸 수 없습니다.", 400, "COUPON_MIN_AMOUNT");
  const total = params.price - discount;

  const holder = await tx.order.findFirst({
    where: { couponIssueId: issue.id, status: { in: ["PENDING", "PAID", "PARTIALLY_REFUNDED"] } },
    include: { lines: { select: { productId: true } }, payments: true },
  });
  if (holder) {
    const payment = holder.payments.find((item) => item.provider === TOSS_PROVIDER);
    const stillPrepared =
      holder.status === "PENDING" &&
      holder.checkout === "TOSS" &&
      holder.userId === params.userId &&
      payment?.status === "PENDING" &&
      payment.providerRef === preparedTossProviderRef(holder.id);
    if (!stillPrepared || !payment) {
      throw new ApiError("이미 결제에 연결된 쿠폰입니다.", 409, "COUPON_BUSY");
    }
    const sameQuote =
      holder.lines.length === 1 &&
      holder.lines[0]?.productId === params.productId &&
      holder.subtotal === params.price &&
      holder.discount === discount &&
      holder.total === total;
    if (sameQuote) return { kind: "reuse", orderId: holder.id, total };
    await tx.order.update({ where: { id: holder.id }, data: { couponIssueId: null, status: "CANCELLED" } });
    await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING", providerRef: preparedTossProviderRef(holder.id) },
      data: { status: "FAILED" },
    });
  }

  const reserved = await tx.shopCouponIssue.updateMany({
    where: { id: issue.id, status: { in: ["ISSUED", "RESERVED"] }, expiresAt: { gt: params.now } },
    data: { status: "RESERVED" },
  });
  if (reserved.count !== 1) throw new ApiError("쿠폰을 사용하지 못했습니다.", 409, "COUPON_BUSY");
  return { kind: "locked", discount, total };
}

export async function consumeReservedCoupon(couponIssueId: string | null) {
  if (!couponIssueId) return;
  await prisma.shopCouponIssue.updateMany({
    where: { id: couponIssueId, status: "RESERVED" },
    data: { status: "USED", usedAt: new Date() },
  });
}

/** Restore a coupon only when its order has been fully refunded. */
export async function restoreRefundedCoupon(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { couponIssueId: true, status: true },
  });
  if (!order?.couponIssueId || order.status !== "REFUNDED") return;
  await tx.shopCouponIssue.updateMany({
    where: { id: order.couponIssueId, status: "USED" },
    data: { status: "ISSUED", usedAt: null },
  });
}

/** Returns a coupon held by an abandoned prepared order so the member can use it again. */
export async function releaseReservedCoupon(orderId: string, db: Prisma.TransactionClient | typeof prisma = prisma) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, couponIssueId: true },
  });
  if (!order?.couponIssueId || order.status !== "PENDING") return;
  await db.shopCouponIssue.updateMany({
    where: { id: order.couponIssueId, status: "RESERVED" },
    data: { status: "ISSUED" },
  });
  await db.order.updateMany({
    where: { id: order.id, status: "PENDING", couponIssueId: order.couponIssueId },
    data: { couponIssueId: null },
  });
}
