import type { Prisma } from "@/generated/prisma/client";

import { addDays, ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

type TransactionClient = Prisma.TransactionClient;

const orderInclude = {
  lines: {
    include: {
      product: {
        include: {
          items: {
            include: {
              course: { select: { id: true, slug: true, title: true } },
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
              usedSessions: true,
              reservedSessions: true,
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
              usedSessions: true,
              reservedSessions: true,
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
  },
) {
  const enrollment = await tx.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: params.userId,
        courseId: params.courseId,
      },
    },
    update: {},
    create: {
      userId: params.userId,
      courseId: params.courseId,
      status: "ACTIVE",
    },
  });

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
    now: Date;
  },
) {
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
    }>;
    now: Date;
  },
) {
  let enrollmentId: string | null = null;

  for (const item of params.items) {
    if (item.kind === "COURSE_ACCESS" && item.courseId) {
      enrollmentId = await grantCourseAccess(tx, {
        userId: params.userId,
        courseId: item.courseId,
        fulfillmentId: params.fulfillmentId,
        orderLineId: params.orderLineId,
        productItemId: item.id,
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
        now: params.now,
      });
    }
  }
}

export async function checkout(params: {
  userId: string;
  productSlug: string;
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

  const product = await prisma.product.findFirst({
    where: { slug: params.productSlug, isActive: true },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const unitPrice = getProductPrice(product);
  const now = new Date();
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

    const fulfillment = await tx.fulfillment.create({
      data: {
        orderId: created.id,
        status: "COMPLETED",
        fulfilledAt: now,
      },
    });

    await fulfillOrderLine(tx, {
      userId: params.userId,
      fulfillmentId: fulfillment.id,
      orderLineId: orderLine.id,
      items: product.items.map((item) => ({
        id: item.id,
        kind: item.kind,
        courseId: item.courseId,
        coachingOfferingId: item.coachingOfferingId,
      })),
      now,
    });

    await tx.auditLog.create({
      data: {
        actorId: params.userId,
        entityType: "Fulfillment",
        entityId: fulfillment.id,
        action: "FULFILL_COMPLETED",
        metadata: {
          orderId: created.id,
          productSlug: product.slug,
        },
      },
    });

    return tx.order.findUniqueOrThrow({
      where: { id: created.id },
      include: orderInclude,
    });
  });

  return order;
}

const ACTIVE_SESSION_STATUSES = new Set([
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
  "RESCHEDULED",
]);

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
              coachingEntitlement: {
                include: {
                  sessions: {
                    where: {
                      status: {
                        in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "RESCHEDULED"],
                      },
                    },
                  },
                },
              },
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
          await tx.enrollment.update({
            where: { id: grant.enrollmentId },
            data: { status: "DROPPED" },
          });
        }

        if (grant.coachingEntitlement) {
          const entitlement = grant.coachingEntitlement;

          const cancelledCount = entitlement.sessions.length;

          for (const session of entitlement.sessions) {
            await tx.coachingSession.update({
              where: { id: session.id },
              data: {
                status: "CANCELLED_BY_COACH",
                cancelledAt: new Date(),
                cancelReason: params.reason ?? "Revoked due to refund",
              },
            });

            await tx.coachingSessionEvent.create({
              data: {
                sessionId: session.id,
                actorId: params.actorId,
                fromStatus: session.status,
                toStatus: "CANCELLED_BY_COACH",
                note: "Cancelled on entitlement revoke",
              },
            });
          }

          await tx.coachingEntitlement.update({
            where: { id: entitlement.id },
            data: {
              reservedSessions: Math.max(0, entitlement.reservedSessions - cancelledCount),
              status: "REVOKED",
            },
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
}) {
  const enrollment = await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: params.userId,
        courseId: params.courseId,
      },
    },
    update: { status: "ACTIVE" },
    create: {
      userId: params.userId,
      courseId: params.courseId,
      status: "ACTIVE",
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true, slug: true } },
    },
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Enrollment",
    entityId: enrollment.id,
    action: "ENROLLMENT_GRANTED",
    metadata: { userId: params.userId, courseId: params.courseId },
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

  const now = new Date();
  const validDays = params.validDays ?? offering.validDays;

  const entitlement = await prisma.coachingEntitlement.create({
    data: {
      userId: params.userId,
      coachingOfferingId: offering.id,
      coachId: offering.coachId,
      courseId: offering.courseId,
      totalSessions: params.totalSessions ?? offering.totalSessions,
      validFrom: now,
      validUntil: addDays(now, validDays),
      status: "ACTIVE",
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      coachingOffering: {
        select: { id: true, title: true, slug: true, coach: { select: { name: true, email: true } } },
      },
    },
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
