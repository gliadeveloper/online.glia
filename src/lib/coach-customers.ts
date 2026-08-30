import { ApiError } from "@/lib/api";
import { getCoachOrderStats } from "@/lib/coach-orders";
import { prisma } from "@/lib/prisma";

export type CoachCustomerRow = {
  userId: string;
  name: string | null;
  email: string;
  enrollments: Array<{
    id: string;
    courseTitle: string;
    courseId: string;
    status: string;
    progressPercent: number;
    enrolledAt: string;
  }>;
  coachingEntitlements: Array<{
    id: string;
    offeringTitle: string;
    status: string;
    completedSessions: number;
    totalSessions: number;
    validUntil: string | null;
  }>;
  lastActivityAt: string | null;
  pendingOrderCount: number;
};

function emptyCustomerRow(
  user: { id: string; name: string | null; email: string },
): CoachCustomerRow {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    enrollments: [],
    coachingEntitlements: [],
    lastActivityAt: null,
    pendingOrderCount: 0,
  };
}

async function listCoachProductIds(coachId: string) {
  const products = await prisma.product.findMany({
    include: {
      items: {
        include: {
          course: { select: { instructorId: true } },
          coachingOffering: { select: { coachId: true } },
        },
      },
    },
  });

  return products
    .filter((product) =>
      product.items.some(
        (item) =>
          item.course?.instructorId === coachId || item.coachingOffering?.coachId === coachId,
      ),
    )
    .map((product) => product.id);
}

export async function listCoachCustomers(coachId: string): Promise<CoachCustomerRow[]> {
  const productIds = await listCoachProductIds(coachId);
  const [enrollments, entitlements, applicants] = await Promise.all([
    prisma.enrollment.findMany({
      where: { course: { instructorId: coachId } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { enrolledAt: "desc" },
    }),
    prisma.coachingEntitlement.findMany({
      where: { coachId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        coachingOffering: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    productIds.length
      ? prisma.order.findMany({
          where: { lines: { some: { productId: { in: productIds } } } },
          select: {
            userId: true,
            status: true,
            createdAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const map = new Map<string, CoachCustomerRow>();

  for (const enrollment of enrollments) {
    const existing = map.get(enrollment.userId) ?? emptyCustomerRow(enrollment.user);

    existing.enrollments.push({
      id: enrollment.id,
      courseTitle: enrollment.course.title,
      courseId: enrollment.course.id,
      status: enrollment.status,
      progressPercent: enrollment.progressPercent,
      enrolledAt: enrollment.enrolledAt.toISOString(),
    });

    const activityAt = enrollment.enrolledAt.toISOString();
    if (!existing.lastActivityAt || activityAt > existing.lastActivityAt) {
      existing.lastActivityAt = activityAt;
    }

    map.set(enrollment.userId, existing);
  }

  for (const entitlement of entitlements) {
    const existing = map.get(entitlement.userId) ?? emptyCustomerRow(entitlement.user);

    existing.coachingEntitlements.push({
      id: entitlement.id,
      offeringTitle: entitlement.coachingOffering.title,
      status: entitlement.status,
      completedSessions: entitlement.completedSessions,
      totalSessions: entitlement.totalSessions,
      validUntil: entitlement.validUntil?.toISOString() ?? null,
    });

    const activityAt = entitlement.createdAt.toISOString();
    if (!existing.lastActivityAt || activityAt > existing.lastActivityAt) {
      existing.lastActivityAt = activityAt;
    }

    map.set(entitlement.userId, existing);
  }

  for (const order of applicants) {
    const existing = map.get(order.userId) ?? emptyCustomerRow(order.user);

    if (order.status === "PENDING") {
      existing.pendingOrderCount += 1;
    }

    const activityAt = order.createdAt.toISOString();
    if (!existing.lastActivityAt || activityAt > existing.lastActivityAt) {
      existing.lastActivityAt = activityAt;
    }

    map.set(order.userId, existing);
  }

  return [...map.values()].sort((a, b) => {
    if (a.pendingOrderCount !== b.pendingOrderCount) {
      return b.pendingOrderCount - a.pendingOrderCount;
    }
    const aTime = a.lastActivityAt ?? "";
    const bTime = b.lastActivityAt ?? "";
    return bTime.localeCompare(aTime);
  });
}

async function findCoachCustomerUser(customerUserId: string) {
  const byId = await prisma.user.findUnique({
    where: { id: customerUserId },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  if (byId) return byId;

  return prisma.user.findUnique({
    where: { userId: customerUserId },
    select: { id: true, name: true, email: true, createdAt: true },
  });
}

export async function getCoachCustomerDetail(coachId: string, customerUserId: string) {
  const user = await findCoachCustomerUser(customerUserId);

  if (!user) {
    throw new ApiError("Customer not found", 404, "USER_NOT_FOUND");
  }

  const productIds = await listCoachProductIds(coachId);

  const [enrollments, entitlements, sessions, orders] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: user.id, course: { instructorId: coachId } },
      include: {
        course: { select: { id: true, title: true, status: true } },
      },
      orderBy: { enrolledAt: "desc" },
    }),
    prisma.coachingEntitlement.findMany({
      where: { userId: user.id, coachId },
      include: {
        coachingOffering: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.coachingSession.findMany({
      where: { userId: user.id, coachId },
      orderBy: [{ scheduledAt: "desc" }, { sessionNo: "asc" }],
      include: {
        entitlement: {
          select: { coachingOffering: { select: { title: true } } },
        },
      },
    }),
    productIds.length
      ? prisma.order.findMany({
          where: {
            userId: user.id,
            lines: { some: { productId: { in: productIds } } },
          },
          orderBy: { createdAt: "desc" },
          include: {
            lines: {
              where: { productId: { in: productIds } },
              include: { product: { select: { title: true, kind: true } } },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  if (enrollments.length === 0 && entitlements.length === 0 && orders.length === 0) {
    throw new ApiError("Customer access denied", 403, "FORBIDDEN");
  }

  return {
    user,
    enrollments,
    entitlements,
    sessions,
    orders,
  };
}

export async function getCoachDashboardStats(coachId: string) {
  const [productCount, courseCount, liveCount, sessionCount, entitlementCount, customerCount, orderStats] =
    await Promise.all([
      prisma.product
        .findMany({ include: { items: { include: { course: true, coachingOffering: true } } } })
        .then(
          (products) =>
            products.filter((product) =>
              product.items.length > 0 &&
              product.items.every(
                (item) =>
                  (item.course?.instructorId === coachId) ||
                  (item.coachingOffering?.coachId === coachId),
              ),
            ).length,
        ),
      prisma.course.count({ where: { instructorId: coachId } }),
      prisma.lesson.count({
        where: { type: "LIVE", module: { course: { instructorId: coachId } } },
      }),
      prisma.coachingSession.count({ where: { coachId } }),
      prisma.coachingEntitlement.count({ where: { coachId, status: "ACTIVE" } }),
      listCoachCustomers(coachId).then((rows) => rows.length),
      getCoachOrderStats(coachId),
    ]);

  return {
    productCount,
    courseCount,
    liveCount,
    sessionCount,
    entitlementCount,
    customerCount,
    orderCount: orderStats.orderCount,
    paidTotal: orderStats.paidTotal,
  };
}
