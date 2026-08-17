import type { AccessDurationKind } from "@/generated/prisma/client";
import type { CatalogProduct } from "@/lib/shop-products";

import { addDays } from "@/lib/api";
import {
  canAccessEnrollment,
  evaluateCourseGrantAction,
  materializeEnrollmentExpiry,
  resolveCourseAccessPolicyFromProductItem,
  type CourseGrantAction,
} from "@/lib/enrollment-access";
import { getProductPrice } from "@/lib/fulfillment";
import { prisma } from "@/lib/prisma";

export type CoachingGrantAction = "grant" | "skip";

export type PurchasePreviewLine = {
  label: string;
  value: string;
};

export type ProductCourseItemAssessment = {
  productItemId: string;
  courseId: string;
  courseTitle: string;
  action: CourseGrantAction;
  accessDuration: AccessDurationKind;
  accessDays: number | null;
  accessLabel: string;
};

export type ProductCoachingItemAssessment = {
  productItemId: string;
  offeringId: string;
  offeringTitle: string;
  action: CoachingGrantAction;
};

export type ProductCheckoutAssessment = {
  productId: string;
  canCheckout: boolean;
  blockCode?: "ALREADY_OWNED";
  blockMessage?: string;
  courseItems: ProductCourseItemAssessment[];
  coachingItems: ProductCoachingItemAssessment[];
};

type ProductShopStateBase = {
  message: string;
  detail: string;
  checkoutLabel: string;
  buttonLabel: string;
  preview: PurchasePreviewLine[];
  learnHref?: string;
};

export type ProductShopState =
  | { kind: "purchase"; checkoutLabel: string; buttonLabel: string; preview: PurchasePreviewLine[] }
  | { kind: "pending"; orderId: string; message: string; detail: string }
  | ({ kind: "owned"; learnHref: string } & Pick<ProductShopStateBase, "message" | "detail">)
  | ({ kind: "extend" } & ProductShopStateBase)
  | ({ kind: "restore" } & ProductShopStateBase)
  | ({ kind: "upgrade" } & ProductShopStateBase)
  | ({ kind: "partial" } & ProductShopStateBase);

export const defaultPurchaseShopState: ProductShopState = {
  kind: "purchase",
  checkoutLabel: "신청하기",
  buttonLabel: "신청하기",
  preview: [],
};

type ProductForAssessment = {
  id: string;
  kind: "COURSE_ONLY" | "COACHING_ONLY" | "BUNDLE";
  listPrice: number;
  salePrice: number | null;
  items: Array<{
    id: string;
    kind: "COURSE_ACCESS" | "COACHING_ACCESS";
    accessDuration: AccessDurationKind;
    accessDays: number | null;
    courseId: string | null;
    coachingOfferingId: string | null;
    course: {
      id: string;
      title: string;
      defaultAccessDuration: AccessDurationKind;
      defaultAccessDays: number | null;
    } | null;
    coachingOffering: {
      id: string;
      title: string;
      totalSessions?: number;
      validDays?: number;
    } | null;
  }>;
};

function formatCourseAccessLabel(accessDuration: AccessDurationKind, accessDays: number | null) {
  if (accessDuration === "LIFETIME") {
    return "평생 수강";
  }

  if (accessDays) {
    return `${accessDays}일 무제한 수강`;
  }

  return "기간제 수강";
}

function formatUntilDate(date: Date) {
  return date.toLocaleDateString("ko-KR");
}

function buildPurchasePreview(
  assessment: ProductCheckoutAssessment,
  product: ProductForAssessment,
  now: Date,
): PurchasePreviewLine[] {
  const lines: PurchasePreviewLine[] = [];

  for (const item of assessment.courseItems) {
    if (item.action === "skip") {
      lines.push({
        label: item.courseTitle,
        value: "이미 보유 중 (변경 없음)",
      });
      continue;
    }

    if (item.action === "grant") {
      if (item.accessDuration === "LIFETIME") {
        lines.push({ label: item.courseTitle, value: "평생 수강 시작" });
      } else {
        const days = item.accessDays ?? 90;
        const until = addDays(now, days);
        lines.push({
          label: item.courseTitle,
          value: `${days}일 수강 (~ ${formatUntilDate(until)}까지)`,
        });
      }
      continue;
    }

    if (item.action === "renew") {
      if (item.accessDuration === "LIFETIME") {
        lines.push({
          label: item.courseTitle,
          value: "평생 수강으로 복구 (기존 진도 유지)",
        });
      } else {
        const days = item.accessDays ?? 90;
        const until = addDays(now, days);
        lines.push({
          label: item.courseTitle,
          value: `${days}일 연장 (~ ${formatUntilDate(until)}까지, 진도 유지)`,
        });
      }
      continue;
    }

    if (item.action === "upgrade") {
      lines.push({
        label: item.courseTitle,
        value: "평생 수강으로 업그레이드 (기존 진도 유지)",
      });
    }
  }

  for (const item of assessment.coachingItems) {
    if (item.action === "grant") {
      const offering = product.items.find((pi) => pi.coachingOfferingId === item.offeringId)
        ?.coachingOffering;
      const sessions = offering?.totalSessions;
      const validDays = offering?.validDays;
      lines.push({
        label: item.offeringTitle,
        value:
          sessions && validDays
            ? `코칭 ${sessions}회 · ${validDays}일 이용권 신규 제공`
            : "코칭 이용권 신규 제공",
      });
    } else {
      lines.push({
        label: item.offeringTitle,
        value: "이미 보유 중 (변경 없음)",
      });
    }
  }

  return lines;
}

async function loadUserEntitlementContext(userId: string, now: Date) {
  const [enrollments, coachingEntitlements] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      select: {
        id: true,
        courseId: true,
        status: true,
        validFrom: true,
        validUntil: true,
        accessDuration: true,
        accessDays: true,
        progressPercent: true,
        completedAt: true,
        expiredAt: true,
        course: { select: { title: true } },
      },
    }),
    prisma.coachingEntitlement.findMany({
      where: {
        userId,
        status: { in: ["ACTIVE", "COMPLETED"] },
        validUntil: { gt: now },
      },
      select: { coachingOfferingId: true },
    }),
  ]);

  const enrollmentByCourseId = new Map<string, (typeof enrollments)[number]>();

  for (const enrollment of enrollments) {
    const materialized = await materializeEnrollmentExpiry(enrollment, now);
    enrollmentByCourseId.set(enrollment.courseId, { ...enrollment, ...materialized });
  }

  const activeOfferingIds = new Set(coachingEntitlements.map((item) => item.coachingOfferingId));

  return { enrollmentByCourseId, activeOfferingIds };
}

export async function assessProductCheckout(
  userId: string,
  product: ProductForAssessment,
  now: Date = new Date(),
): Promise<ProductCheckoutAssessment> {
  const { enrollmentByCourseId, activeOfferingIds } = await loadUserEntitlementContext(userId, now);

  const courseItems: ProductCourseItemAssessment[] = [];
  const coachingItems: ProductCoachingItemAssessment[] = [];

  for (const item of product.items) {
    if (item.kind === "COURSE_ACCESS" && item.courseId && item.course) {
      const policy = resolveCourseAccessPolicyFromProductItem({
        accessDuration: item.accessDuration,
        accessDays: item.accessDays,
        course: item.course,
      });
      const enrollment = enrollmentByCourseId.get(item.courseId) ?? null;

      courseItems.push({
        productItemId: item.id,
        courseId: item.courseId,
        courseTitle: item.course.title,
        action: evaluateCourseGrantAction({ enrollment, policy, now }),
        accessDuration: policy.accessDuration,
        accessDays: policy.accessDays,
        accessLabel: formatCourseAccessLabel(policy.accessDuration, policy.accessDays),
      });
    }

    if (item.kind === "COACHING_ACCESS" && item.coachingOfferingId && item.coachingOffering) {
      coachingItems.push({
        productItemId: item.id,
        offeringId: item.coachingOfferingId,
        offeringTitle: item.coachingOffering.title,
        action: activeOfferingIds.has(item.coachingOfferingId) ? "skip" : "grant",
      });
    }
  }

  const grantableActions = [
    ...courseItems.map((item) => item.action),
    ...coachingItems.map((item) => item.action),
  ].filter((action) => action !== "skip");

  if (grantableActions.length === 0) {
    return {
      productId: product.id,
      canCheckout: false,
      blockCode: "ALREADY_OWNED",
      blockMessage: "이미 보유 중인 수강권과 동일하거나 더 유리한 권한을 가지고 있습니다.",
      courseItems,
      coachingItems,
    };
  }

  return {
    productId: product.id,
    canCheckout: true,
    courseItems,
    coachingItems,
  };
}

export function deriveProductShopState(
  product: ProductForAssessment,
  assessment: ProductCheckoutAssessment,
  now: Date = new Date(),
): ProductShopState {
  const price = getProductPrice(product);
  const priceLabel = `${price.toLocaleString("ko-KR")}원`;
  const preview = buildPurchasePreview(assessment, product, now);
  const primaryCourse = assessment.courseItems[0];
  const learnHref = primaryCourse ? `/learning/${primaryCourse.courseId}` : "/learning";

  if (!assessment.canCheckout && assessment.blockCode === "ALREADY_OWNED") {
    return {
      kind: "owned",
      message: "이미 수강 중인 강의입니다",
      detail: "현재 유효한 수강 권한이 있습니다. 내 학습에서 이어서 들으실 수 있습니다.",
      learnHref,
    };
  }

  const renewCourses = assessment.courseItems.filter((item) => item.action === "renew");
  const upgradeCourses = assessment.courseItems.filter((item) => item.action === "upgrade");
  const skippedCourses = assessment.courseItems.filter((item) => item.action === "skip");
  const grantableCoaching = assessment.coachingItems.filter((item) => item.action === "grant");

  const baseCheckout = (buttonLabel: string) => ({
    checkoutLabel: `${buttonLabel} · ${priceLabel}`,
    buttonLabel,
    preview,
    learnHref,
  });

  if (renewCourses.length > 0) {
    const primaryRenew = renewCourses[0]!;
    const courseNames = renewCourses.map((item) => item.courseTitle).join(", ");
    const isLifetimeRestore = renewCourses.every((item) => item.accessDuration === "LIFETIME");

    if (isLifetimeRestore) {
      const coachingNote =
        grantableCoaching.length > 0
          ? ` ${grantableCoaching.map((item) => item.offeringTitle).join(", ")}도 함께 제공됩니다.`
          : "";

      return {
        kind: "restore",
        message: "평생 수강으로 복구할 수 있습니다",
        detail: `${courseNames}의 수강 기간이 만료되었습니다. 이 상품 구매 시 평생 수강이 다시 적용됩니다.${coachingNote}`,
        ...baseCheckout("평생 수강 복구"),
      };
    }

    const days = primaryRenew.accessDays ?? 90;
    return {
      kind: "extend",
      message: "수강 기간을 연장할 수 있습니다",
      detail: `${courseNames}의 수강 기간이 만료되었습니다. 구매 시 ${days}일 수강이 다시 시작됩니다.`,
      ...baseCheckout(`${days}일 수강 연장`),
    };
  }

  if (upgradeCourses.length > 0) {
    const names = upgradeCourses.map((item) => item.courseTitle).join(", ");
    const coachingNote =
      grantableCoaching.length > 0
        ? ` ${grantableCoaching.map((item) => item.offeringTitle).join(", ")}도 함께 제공됩니다.`
        : "";

    return {
      kind: "upgrade",
      message: "평생 수강으로 업그레이드됩니다",
      detail: `${names}은(는) 기간제 수강 중입니다. 구매 시 평생 수강으로 업그레이드되며 진도는 유지됩니다.${coachingNote}`,
      ...baseCheckout("평생 수강 업그레이드"),
    };
  }

  if (skippedCourses.length > 0 && grantableCoaching.length > 0) {
    return {
      kind: "partial",
      message: "일부 항목만 새로 제공됩니다",
      detail: `강의는 이미 수강 중이며, ${grantableCoaching.map((item) => item.offeringTitle).join(", ")}만 새로 제공됩니다.`,
      ...baseCheckout("코칭 추가 구매"),
    };
  }

  return {
    kind: "purchase",
    checkoutLabel: `신청하기 · ${priceLabel}`,
    buttonLabel: "신청하기",
    preview,
  };
}

export async function getProductShopState(userId: string, product: ProductForAssessment) {
  const now = new Date();
  const { findPendingOrderForProduct } = await import("@/lib/fulfillment");
  const pendingOrder = await findPendingOrderForProduct(userId, product.id);
  const assessment = await assessProductCheckout(userId, product, now);
  const shopState = deriveProductShopState(product, assessment, now);

  if (pendingOrder && shopState.kind !== "owned") {
    return {
      assessment,
      shopState: {
        kind: "pending" as const,
        orderId: pendingOrder.id,
        message: "승인 대기 중",
        detail: "코치 확인 후 수강 권한이 부여됩니다. 주문 내역에서 진행 상태를 확인할 수 있어요.",
      },
    };
  }

  return { assessment, shopState };
}

export async function getCatalogProductShopStates(userId: string, products: CatalogProduct[]) {
  const entries = await Promise.all(
    products.map(async (product) => {
      const { shopState } = await getProductShopState(userId, product);
      return [product.id, shopState] as const;
    }),
  );

  return new Map(entries);
}

export async function findExtensionProductId(courseId: string) {
  const items = await prisma.productItem.findMany({
    where: {
      kind: "COURSE_ACCESS",
      courseId,
      accessDuration: "FIXED_DAYS",
      product: { isActive: true },
    },
    include: {
      product: { select: { id: true, kind: true } },
    },
    orderBy: [{ product: { kind: "asc" } }, { product: { title: "asc" } }],
  });

  const preferred =
    items.find((item) => item.product.kind === "COURSE_ONLY") ?? items[0];

  return preferred?.product.id ?? null;
}

/** @deprecated Use findExtensionProductId */
export const findPrimaryRenewalProductId = findExtensionProductId;

export async function findLifetimeRestoreProductId(courseId: string) {
  const items = await prisma.productItem.findMany({
    where: {
      kind: "COURSE_ACCESS",
      courseId,
      accessDuration: "LIFETIME",
      product: { isActive: true },
    },
    include: {
      product: { select: { id: true, kind: true } },
    },
  });

  const bundle = items.find((item) => item.product.kind === "BUNDLE");
  const courseOnly = items.find((item) => item.product.kind === "COURSE_ONLY");

  return bundle?.product.id ?? courseOnly?.product.id ?? items[0]?.product.id ?? null;
}

export async function getCourseShopStateById(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true },
  });

  if (!course) {
    return null;
  }

  const [extensionProductId, restoreProductId] = await Promise.all([
    findExtensionProductId(course.id),
    findLifetimeRestoreProductId(course.id),
  ]);

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: course.id,
      },
    },
    select: {
      id: true,
      status: true,
      validFrom: true,
      validUntil: true,
      accessDuration: true,
      accessDays: true,
      progressPercent: true,
      completedAt: true,
      expiredAt: true,
    },
  });

  if (!enrollment) {
    return { kind: "none" as const, extensionProductId, restoreProductId };
  }

  const materialized = await materializeEnrollmentExpiry(enrollment);

  if (canAccessEnrollment(materialized)) {
    return {
      kind: "active" as const,
      extensionProductId,
      restoreProductId,
      learnHref: `/learning/${course.id}`,
    };
  }

  if (materialized.status === "EXPIRED") {
    return {
      kind: "expired" as const,
      extensionProductId,
      restoreProductId,
      extendHref: extensionProductId ? `/shop/${extensionProductId}` : "/shop",
      restoreHref: restoreProductId ? `/shop/${restoreProductId}` : "/shop",
    };
  }

  return { kind: "blocked" as const, extensionProductId, restoreProductId };
}
