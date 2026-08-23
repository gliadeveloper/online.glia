import { materializeEnrollmentExpiry } from "@/lib/enrollment-access";
import { prisma } from "@/lib/prisma";
import {
  findExtensionProductId,
  findLifetimeRestoreProductId,
} from "@/lib/shop-purchase-state";

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

  return materialized.map((enrollment, index) => ({
    ...enrollment,
    extendHref: renewLinks[index]!.extendHref,
    restoreHref: renewLinks[index]!.restoreHref,
  }));
}

export type UserEnrollment = Awaited<ReturnType<typeof getUserEnrollments>>[number];
