import { materializeEnrollmentExpiry } from "@/lib/enrollment-access";
import { prisma } from "@/lib/prisma";
import {
  findExtensionProductId,
  findLifetimeRestoreProductId,
} from "@/lib/shop-purchase-state";

/** Latest purchased product cover for each enrollment. Empty when that product has no thumbnail. */
export async function productThumbnailsForEnrollments(enrollmentIds: string[]) {
  const covers = new Map<string, string>();
  if (enrollmentIds.length === 0) return covers;

  const grants = await prisma.entitlementGrant.findMany({
    where: { enrollmentId: { in: enrollmentIds } },
    orderBy: { createdAt: "desc" },
    select: {
      enrollmentId: true,
      productItem: { select: { product: { select: { thumbnailUrl: true } } } },
    },
  });

  for (const grant of grants) {
    if (!grant.enrollmentId || covers.has(grant.enrollmentId)) continue;
    const thumbnailUrl = grant.productItem.product.thumbnailUrl?.trim();
    if (thumbnailUrl) covers.set(grant.enrollmentId, thumbnailUrl);
  }

  return covers;
}

export async function getUserEnrollments(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId,
      status: { in: ["ACTIVE", "COMPLETED", "EXPIRED"] },
    },
    orderBy: { enrolledAt: "desc" },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          level: true,
          categories: { include: { category: { select: { name: true } } } },
          modules: {
            orderBy: { order: "asc" },
            include: {
              lessons: { orderBy: { order: "asc" }, select: { id: true } },
            },
          },
        },
      },
      progress: { select: { lessonId: true, status: true } },
    },
  });

  const materialized = await Promise.all(
    enrollments.map(async (enrollment) => ({
      ...enrollment,
      ...(await materializeEnrollmentExpiry(enrollment)),
    })),
  );

  const renewLinks = await Promise.all(
    materialized.map(async (enrollment) => {
      if (enrollment.status !== "EXPIRED") {
        return { extendHref: "/shop", restoreHref: null as string | null };
      }

      const [extensionProductId, restoreProductId] = await Promise.all([
        findExtensionProductId(enrollment.courseId),
        findLifetimeRestoreProductId(enrollment.courseId),
      ]);

      return {
        extendHref: extensionProductId ? `/shop/${extensionProductId}` : "/shop",
        restoreHref: restoreProductId ? `/shop/${restoreProductId}` : null,
      };
    }),
  );

  const productCovers = await productThumbnailsForEnrollments(
    materialized.map((enrollment) => enrollment.id),
  );

  return materialized.map((enrollment, index) => ({
    ...enrollment,
    productThumbnailUrl: productCovers.get(enrollment.id) ?? null,
    extendHref: renewLinks[index]!.extendHref,
    restoreHref: renewLinks[index]!.restoreHref,
  }));
}

export type UserEnrollment = Awaited<ReturnType<typeof getUserEnrollments>>[number];
