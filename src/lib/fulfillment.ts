import type { Prisma } from "@/generated/prisma/client";

import { addDays, ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { provisionCoachingSessions } from "@/lib/coaching-provision";
import {
  computeEnrollmentAccessGrant,
  evaluateCourseGrantAction,
  mergeEnrollmentAccessRenewal,
  resolveCourseAccessPolicyFromCourse,
  resolveCourseAccessPolicyFromProductItem,
  type CourseAccessPolicy,
  type CourseGrantAction,
} from "@/lib/enrollment-access";
import { prisma } from "@/lib/prisma";
import { assessProductCheckout, type CoachingGrantAction } from "@/lib/shop-purchase-state";

type TransactionClient = Prisma.TransactionClient;

const orderInclude = {
  lines: {
    include: {
      product: {
        include: {
          items: {
            include: {
              course: { select: { id: true, title: true } },
              coachingOffering: {
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  totalSessions: true,
                  validDays: true,
                  coachId: true,
                  courseId: true,
                },
              },
            },
            orderBy: { sortOrder: "asc" as const },
          },
        },
      },
      entitlementGrants: {
        include: {
          enrollment: { select: { id: true, courseId: true, status: true } },
          coachingEntitlement: {
            select: {
              id: true,
              totalSessions: true,
              completedSessions: true,
              validUntil: true,
              status: true,
            },
          },
        },
      },
    },
  },
  payments: true,
  fulfillments: {
    include: {
      grants: {
        include: {
          enrollment: { select: { id: true, courseId: true, status: true } },
          coachingEntitlement: {
            select: {
              id: true,
              totalSessions: true,
              completedSessions: true,
              validUntil: true,
              status: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

export function getProductPrice(product: { listPrice: number; salePrice: number | null }) {
  return product.salePrice ?? product.listPrice;
}

async function grantCourseAccess(
  tx: TransactionClient,
  params: {
    userId: string;
    courseId: string;
    fulfillmentId: string;
    orderLineId: string;
    productItemId: string;
    policy: CourseAccessPolicy;
    action: CourseGrantAction;
    now: Date;
  },
) {
  const existing = await tx.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: params.userId,
        courseId: params.courseId,
      },
    },
  });

  let enrollment;

  if (params.action === "skip" && existing) {
    enrollment = existing;
  } else {
    const accessData =
      existing && params.action !== "grant"
        ? mergeEnrollmentAccessRenewal(existing, params.policy, params.now)
        : computeEnrollmentAccessGrant({
            existing,
            policy: params.policy,
            now: params.now,
          });

    enrollment = existing
      ? await tx.enrollment.update({
          where: { id: existing.id },
          data: accessData,
        })
      : await tx.enrollment.create({
          data: {
            userId: params.userId,
            courseId: params.courseId,
            ...accessData,
          },
        });
  }

  await tx.entitlementGrant.create({
    data: {
      fulfillmentId: params.fulfillmentId,
      orderLineId: params.orderLineId,
      productItemId: params.productItemId,
      grantType: "COURSE",
      enrollmentId: enrollment.id,
    },
  });

  return enrollment.id;
}

async function grantCoachingAccess(
  tx: TransactionClient,
  params: {
    userId: string;
    coachingOfferingId: string;
    fulfillmentId: string;
    orderLineId: string;
    productItemId: string;
    enrollmentId?: string | null;
    action: CoachingGrantAction;
    now: Date;
  },
) {
  if (params.action === "skip") {
    return null;
  }

  const offering = await tx.coachingOffering.findUniqueOrThrow({
    where: { id: params.coachingOfferingId },
  });

  const entitlement = await tx.coachingEntitlement.create({
    data: {
      userId: params.userId,
      coachingOfferingId: offering.id,
      coachId: offering.coachId,
      courseId: offering.courseId ?? undefined,
      enrollmentId: params.enrollmentId ?? undefined,
      totalSessions: offering.totalSessions,
      validFrom: params.now,
      validUntil: addDays(params.now, offering.validDays),
      status: "ACTIVE",
    },
  });

  if (!offering.coachId) {
    throw new Error("COACH_NOT_ASSIGNED");
  }

  await provisionCoachingSessions(tx, {
    entitlementId: entitlement.id,
    userId: params.userId,
    coachId: offering.coachId,
    offeringId: offering.id,
    totalSessions: offering.totalSessions,
    validFrom: params.now,
  });

  await tx.entitlementGrant.create({
    data: {
      fulfillmentId: params.fulfillmentId,
      orderLineId: params.orderLineId,
      productItemId: params.productItemId,
      grantType: "COACHING",
      coachingEntitlementId: entitlement.id,
    },
  });

  return entitlement.id;
}

async function fulfillOrderLine(
  tx: TransactionClient,
  params: {
    userId: string;
    fulfillmentId: string;
    orderLineId: string;
    items: Array<{
      id: string;
      kind: "COURSE_ACCESS" | "COACHING_ACCESS";
      courseId: string | null;
      coachingOfferingId: string | null;
      accessDuration: "LIFETIME" | "FIXED_DAYS";
      accessDays: number | null;
      course: {
        defaultAccessDuration: "LIFETIME" | "FIXED_DAYS";
        defaultAccessDays: number | null;
      } | null;
      courseAction?: CourseGrantAction;
      coachingAction?: CoachingGrantAction;
    }>;
    now: Date;
  },
) {
  let enrollmentId: string | null = null;

  for (const item of params.items) {
    if (item.kind === "COURSE_ACCESS" && item.courseId) {
      const policy = resolveCourseAccessPolicyFromProductItem({
        accessDuration: item.accessDuration,
        accessDays: item.accessDays,
        course: item.course,
      });
      const action =
        item.courseAction ??
        evaluateCourseGrantAction({
          enrollment: await tx.enrollment.findUnique({
            where: {
              userId_courseId: {
                userId: params.userId,
                courseId: item.courseId,
              },
            },
          }),
          policy,
          now: params.now,
        });

      enrollmentId = await grantCourseAccess(tx, {
        userId: params.userId,
        courseId: item.courseId,
        fulfillmentId: params.fulfillmentId,
        orderLineId: params.orderLineId,
        productItemId: item.id,
        policy,
        action,
        now: params.now,
      });
    }
  }

  for (const item of params.items) {
    if (item.kind === "COACHING_ACCESS" && item.coachingOfferingId) {
      await grantCoachingAccess(tx, {
        userId: params.userId,
        coachingOfferingId: item.coachingOfferingId,
        fulfillmentId: params.fulfillmentId,
        orderLineId: params.orderLineId,
        productItemId: item.id,
        enrollmentId,
        action: item.coachingAction ?? "grant",
        now: params.now,
      });
    }
  }
}

const checkoutProductInclude = {
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          defaultAccessDuration: true,
          defaultAccessDays: true,
        },
      },
      coachingOffering: {
        select: { id: true, title: true },
      },
    },
  },
} satisfies Prisma.ProductInclude;

type CheckoutProduct = Prisma.ProductGetPayload<{ include: typeof checkoutProductInclude }>;

async function loadActiveProductById(productId: string): Promise<CheckoutProduct | null> {
  return prisma.product.findFirst({
    where: { id: productId, isActive: true },
    include: checkoutProductInclude,
  });
}

async function runOrderFulfillment(
  tx: TransactionClient,
  params: {
    actorId: string;
    orderId: string;
    userId: string;
    orderLineId: string;
    product: CheckoutProduct;
    courseActionByItemId: Map<string, CourseGrantAction | undefined>;
    coachingActionByItemId: Map<string, CoachingGrantAction | undefined>;
    now: Date;
  },
) {
  const fulfillment = await tx.fulfillment.create({
    data: {
      orderId: params.orderId,
      status: "COMPLETED",
      fulfilledAt: params.now,
    },
  });

  await fulfillOrderLine(tx, {
    userId: params.userId,
    fulfillmentId: fulfillment.id,
    orderLineId: params.orderLineId,
    items: params.product.items.map((item) => ({
      id: item.id,
      kind: item.kind,
      courseId: item.courseId,
      coachingOfferingId: item.coachingOfferingId,
      accessDuration: item.accessDuration,
      accessDays: item.accessDays,
      course: item.course,
      courseAction: params.courseActionByItemId.get(item.id),
      coachingAction: params.coachingActionByItemId.get(item.id),
    })),
    now: params.now,
  });

  await tx.auditLog.create({
    data: {
      actorId: params.actorId,
      entityType: "Fulfillment",
      entityId: fulfillment.id,
      action: "FULFILL_COMPLETED",
      metadata: {
        orderId: params.orderId,
        productId: params.product.id,
      },
    },
  });

  return fulfillment;
}

export async function findPendingOrderForProduct(userId: string, productId: string) {
  return prisma.order.findFirst({
    where: {
      userId,
      status: "PENDING",
      lines: { some: { productId } },
    },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Class101-style apply — PENDING order without payment (PG 없음). */
export async function submitProductApplication(params: {
  userId: string;
  productId: string;
  idempotencyKey?: string;
}) {
  if (params.idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
      include: orderInclude,
    });

    if (existing) {
      return existing;
    }
  }

  const product = await loadActiveProductById(params.productId);
  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const now = new Date();
  const checkoutAssessment = await assessProductCheckout(params.userId, product, now);

  if (!checkoutAssessment.canCheckout) {
    throw new ApiError(
      checkoutAssessment.blockMessage ?? "Already owned",
      409,
      checkoutAssessment.blockCode ?? "ALREADY_OWNED",
    );
  }

  const existingPending = await findPendingOrderForProduct(params.userId, product.id);
  if (existingPending) {
    throw new ApiError(
      "이미 승인 대기 중인 신청이 있습니다.",
      409,
      "APPLICATION_PENDING",
    );
  }

  const unitPrice = getProductPrice(product);

  const order = await prisma.order.create({
    data: {
      userId: params.userId,
      status: "PENDING",
      subtotal: unitPrice,
      total: unitPrice,
      idempotencyKey: params.idempotencyKey,
      lines: {
        create: {
          productId: product.id,
          unitPrice,
          lineTotal: unitPrice,
        },
      },
    },
    include: orderInclude,
  });

  await writeAuditLog({
    actorId: params.userId,
    entityType: "Order",
    entityId: order.id,
    action: "APPLICATION_SUBMITTED",
    metadata: { productId: product.id },
  });

  return order;
}

/** Coach/Admin approves a pending application — grants entitlements. */
export async function approveProductApplication(params: { orderId: string; actorId: string }) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      lines: {
        include: {
          product: { include: checkoutProductInclude },
        },
      },
    },
  });

  if (!order) {
    throw new ApiError("Order not found", 404, "ORDER_NOT_FOUND");
  }

  if (order.status !== "PENDING") {
    throw new ApiError(`Cannot approve order with status ${order.status}`, 409, "INVALID_STATUS");
  }

  const orderLine = order.lines[0];
  const product = orderLine?.product;
  if (!orderLine || !product) {
    throw new ApiError("Order line missing", 409, "ORDER_LINE_MISSING");
  }

  const now = new Date();
  const checkoutAssessment = await assessProductCheckout(order.userId, product, now);

  if (!checkoutAssessment.canCheckout) {
    throw new ApiError(
      checkoutAssessment.blockMessage ?? "Cannot approve this application",
      409,
      checkoutAssessment.blockCode ?? "ALREADY_OWNED",
    );
  }

  const courseActionByItemId = new Map(
    checkoutAssessment.courseItems.map((item) => [item.productItemId, item.action]),
  );
  const coachingActionByItemId = new Map(
    checkoutAssessment.coachingItems.map((item) => [item.productItemId, item.action]),
  );

  const providerRef = `approve-${crypto.randomUUID()}`;

  return prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", paidAt: now },
    });

    await tx.payment.create({
      data: {
        orderId: order.id,
        provider: "manual",
        providerRef,
        amount: order.total,
        status: "SUCCEEDED",
        paidAt: now,
      },
    });

    await runOrderFulfillment(tx, {
      actorId: params.actorId,
      orderId: order.id,
      userId: order.userId,
      orderLineId: orderLine.id,
      product,
      courseActionByItemId,
      coachingActionByItemId,
      now,
    });

    await writeAuditLog({
      actorId: params.actorId,
      entityType: "Order",
      entityId: order.id,
      action: "APPLICATION_APPROVED",
      metadata: { productId: product.id },
    });

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: orderInclude,
    });
  });
}

export async function rejectProductApplication(params: {
  orderId: string;
  actorId: string;
  reason?: string;
}) {
  const order = await prisma.order.findUnique({ where: { id: params.orderId } });

  if (!order) {
    throw new ApiError("Order not found", 404, "ORDER_NOT_FOUND");
  }

  if (order.status !== "PENDING") {
    throw new ApiError(`Cannot reject order with status ${order.status}`, 409, "INVALID_STATUS");
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });

    await writeAuditLog({
      actorId: params.actorId,
      entityType: "Order",
      entityId: order.id,
      action: "APPLICATION_REJECTED",
      metadata: { reason: params.reason },
    });
  });

  return prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: orderInclude,
  });
}

export async function checkout(params: {
  userId: string;
  productId: string;
  idempotencyKey?: string;
}) {
  if (params.idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
      include: orderInclude,
    });

    if (existing) {
      return existing;
    }
  }

  const product = await loadActiveProductById(params.productId);

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const now = new Date();
  const checkoutAssessment = await assessProductCheckout(params.userId, product, now);

  if (!checkoutAssessment.canCheckout) {
    throw new ApiError(
      checkoutAssessment.blockMessage ?? "Already owned",
      409,
      checkoutAssessment.blockCode ?? "ALREADY_OWNED",
    );
  }

  const courseActionByItemId = new Map(
    checkoutAssessment.courseItems.map((item) => [item.productItemId, item.action]),
  );
  const coachingActionByItemId = new Map(
    checkoutAssessment.coachingItems.map((item) => [item.productItemId, item.action]),
  );

  const unitPrice = getProductPrice(product);
  const providerRef = `demo-${crypto.randomUUID()}`;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId: params.userId,
        status: "PAID",
        subtotal: unitPrice,
        total: unitPrice,
        idempotencyKey: params.idempotencyKey,
        paidAt: now,
        lines: {
          create: {
            productId: product.id,
            unitPrice,
            lineTotal: unitPrice,
          },
        },
        payments: {
          create: {
            provider: "demo",
            providerRef,
            amount: unitPrice,
            status: "SUCCEEDED",
            paidAt: now,
          },
        },
      },
      include: {
        lines: true,
      },
    });

    const orderLine = created.lines[0];
    if (!orderLine) {
      throw new Error("ORDER_LINE_MISSING");
    }

    await runOrderFulfillment(tx, {
      actorId: params.userId,
      orderId: created.id,
      userId: params.userId,
      orderLineId: orderLine.id,
      product,
      courseActionByItemId,
      coachingActionByItemId,
      now,
    });

    return tx.order.findUniqueOrThrow({
      where: { id: created.id },
      include: orderInclude,
    });
  });

  return order;
}

export async function revokeFulfillment(params: {
  orderId: string;
  actorId: string;
  reason?: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      fulfillments: {
        where: { status: "COMPLETED" },
        include: {
          grants: {
            include: {
              enrollment: true,
              coachingEntitlement: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new ApiError("Order not found", 404, "ORDER_NOT_FOUND");
  }

  if (!order.fulfillments.length) {
    throw new ApiError("No completed fulfillment to revoke", 409, "NO_FULFILLMENT");
  }

  await prisma.$transaction(async (tx) => {
    for (const fulfillment of order.fulfillments) {
      await tx.fulfillment.update({
        where: { id: fulfillment.id },
        data: { status: "REVOKED", revokedAt: new Date() },
      });

      for (const grant of fulfillment.grants) {
        if (grant.enrollmentId) {
          const now = new Date();
          await tx.enrollment.update({
            where: { id: grant.enrollmentId },
            data: { status: "DROPPED", validUntil: now, expiredAt: now },
          });
        }

        if (grant.coachingEntitlementId) {
          await tx.coachingEntitlement.update({
            where: { id: grant.coachingEntitlementId },
            data: { status: "REVOKED" },
          });
        }
      }

      await writeAuditLog({
        actorId: params.actorId,
        entityType: "Fulfillment",
        entityId: fulfillment.id,
        action: "FULFILL_REVOKED",
        metadata: { orderId: params.orderId, reason: params.reason },
      });
    }
  });
}

export async function processRefund(params: {
  orderId: string;
  actorId: string;
  amount?: number;
  reason?: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { payments: true, refunds: true },
  });

  if (!order) {
    throw new ApiError("Order not found", 404, "ORDER_NOT_FOUND");
  }

  if (order.status === "REFUNDED") {
    throw new ApiError("Order already refunded", 409, "ALREADY_REFUNDED");
  }

  if (order.status !== "PAID" && order.status !== "PARTIALLY_REFUNDED") {
    throw new ApiError(`Cannot refund order with status ${order.status}`, 409, "INVALID_STATUS");
  }

  const refundAmount = params.amount ?? order.total;
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const refund = await tx.refund.create({
      data: {
        orderId: order.id,
        amount: refundAmount,
        reason: params.reason,
        status: "COMPLETED",
        refundedAt: now,
      },
    });

    const isFullRefund = refundAmount >= order.total;

    await tx.order.update({
      where: { id: order.id },
      data: { status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED" },
    });

    for (const payment of order.payments) {
      if (payment.status === "SUCCEEDED") {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "REFUNDED" },
        });
      }
    }

    return refund;
  });

  if (refundAmount >= order.total) {
    await revokeFulfillment({
      orderId: params.orderId,
      actorId: params.actorId,
      reason: params.reason,
    });
  }

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Order",
    entityId: order.id,
    action: "REFUND_COMPLETED",
    metadata: { amount: refundAmount, reason: params.reason },
  });

  return prisma.order.findUniqueOrThrow({
    where: { id: params.orderId },
    include: orderInclude,
  });
}

export async function adminGrantCourseAccess(params: {
  actorId: string;
  userId: string;
  courseId: string;
  accessDays?: number;
}) {
  const course = await prisma.course.findUniqueOrThrow({
    where: { id: params.courseId },
    select: {
      id: true,
      defaultAccessDuration: true,
      defaultAccessDays: true,
    },
  });

  const policy = params.accessDays
    ? { accessDuration: "FIXED_DAYS" as const, accessDays: params.accessDays }
    : resolveCourseAccessPolicyFromCourse(course);

  const now = new Date();
  const existing = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: params.userId,
        courseId: params.courseId,
      },
    },
  });

  const accessData = computeEnrollmentAccessGrant({ existing, policy, now });

  const enrollment = existing
    ? await prisma.enrollment.update({
        where: { id: existing.id },
        data: accessData,
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true } },
        },
      })
    : await prisma.enrollment.create({
        data: {
          userId: params.userId,
          courseId: params.courseId,
          ...accessData,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true } },
        },
      });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Enrollment",
    entityId: enrollment.id,
    action: "ENROLLMENT_GRANTED",
    metadata: {
      userId: params.userId,
      courseId: params.courseId,
      accessDuration: policy.accessDuration,
      accessDays: policy.accessDays,
      validUntil: enrollment.validUntil?.toISOString() ?? null,
    },
  });

  return enrollment;
}

export async function adminGrantCoachingEntitlement(params: {
  actorId: string;
  userId: string;
  coachingOfferingId: string;
  totalSessions?: number;
  validDays?: number;
}) {
  const offering = await prisma.coachingOffering.findUniqueOrThrow({
    where: { id: params.coachingOfferingId },
  });

  if (!offering.coachId) {
    throw new ApiError("Coaching offering has no coach assigned", 409, "COACH_NOT_ASSIGNED");
  }

  const now = new Date();
  const validDays = params.validDays ?? offering.validDays;
  const totalSessions = params.totalSessions ?? offering.totalSessions;

  const entitlement = await prisma.$transaction(async (tx) => {
    const created = await tx.coachingEntitlement.create({
      data: {
        userId: params.userId,
        coachingOfferingId: offering.id,
        coachId: offering.coachId,
        courseId: offering.courseId,
        totalSessions,
        validFrom: now,
        validUntil: addDays(now, validDays),
        status: "ACTIVE",
      },
    });

    await provisionCoachingSessions(tx, {
      entitlementId: created.id,
      userId: params.userId,
      coachId: offering.coachId!,
      offeringId: offering.id,
      totalSessions,
      validFrom: now,
    });

    return tx.coachingEntitlement.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        coachingOffering: {
          select: { id: true, title: true, slug: true, coach: { select: { name: true, email: true } } },
        },
        sessions: { orderBy: { sessionNo: "asc" } },
      },
    });
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "CoachingEntitlement",
    entityId: entitlement.id,
    action: "ENTITLEMENT_GRANTED",
    metadata: { userId: params.userId, offeringId: offering.id },
  });

  return entitlement;
}

export { orderInclude };
