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
};

export async function listCoachCustomers(coachId: string): Promise<CoachCustomerRow[]> {
  const [enrollments, entitlements] = await Promise.all([
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
  ]);

  const map = new Map<string, CoachCustomerRow>();

  for (const enrollment of enrollments) {
    const existing = map.get(enrollment.userId) ?? {
      userId: enrollment.userId,
      name: enrollment.user.name,
      email: enrollment.user.email,
      enrollments: [],
      coachingEntitlements: [],
      lastActivityAt: null,
    };

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
    const existing = map.get(entitlement.userId) ?? {
      userId: entitlement.userId,
      name: entitlement.user.name,
      email: entitlement.user.email,
      enrollments: [],
      coachingEntitlements: [],
      lastActivityAt: null,
    };

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

  return [...map.values()].sort((a, b) => {
    const aTime = a.lastActivityAt ?? "";
    const bTime = b.lastActivityAt ?? "";
    return bTime.localeCompare(aTime);
  });
}

export async function getCoachCustomerDetail(coachId: string, customerUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id: customerUserId },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!user) {
    throw new ApiError("Customer not found", 404, "USER_NOT_FOUND");
  }

  const productIds = (
    await prisma.product.findMany({
      include: {
        items: {
          include: {
            course: { select: { instructorId: true } },
            coachingOffering: { select: { coachId: true } },
          },
        },
      },
    })
  )
    .filter(
      (product) =>
        product.items.length > 0 &&
        product.items.every(
          (item) =>
            item.course?.instructorId === coachId || item.coachingOffering?.coachId === coachId,
        ),
    )
    .map((product) => product.id);

  const [enrollments, entitlements, sessions, orders] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: customerUserId, course: { instructorId: coachId } },
      include: {
        course: { select: { id: true, title: true, status: true } },
      },
      orderBy: { enrolledAt: "desc" },
    }),
    prisma.coachingEntitlement.findMany({
      where: { userId: customerUserId, coachId },
      include: {
        coachingOffering: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.coachingSession.findMany({
      where: { userId: customerUserId, coachId },
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
            userId: customerUserId,
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

  if (enrollments.length === 0 && entitlements.length === 0) {
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
