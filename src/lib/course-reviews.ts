import { prisma } from "@/lib/prisma";

const authorSelect = {
  id: true,
  name: true,
  email: true,
} as const;

export function getProductCourseIds(items: Array<{ courseId: string | null }>) {
  return items.map((item) => item.courseId).filter((id): id is string => !!id);
}

export async function getProductReviewSummary(courseIds: string[]) {
  if (courseIds.length === 0) {
    return { averageRating: 0, reviewCount: 0 };
  }

  const aggregate = await prisma.review.aggregate({
    where: { courseId: { in: courseIds } },
    _avg: { rating: true },
    _count: { id: true },
  });

  return {
    averageRating: aggregate._avg.rating ?? 0,
    reviewCount: aggregate._count.id,
  };
}

export async function getProductReviews(courseIds: string[], limit = 8) {
  if (courseIds.length === 0) {
    return [];
  }

  return prisma.review.findMany({
    where: { courseId: { in: courseIds } },
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      user: { select: authorSelect },
      course: { select: { title: true } },
    },
  });
}

export async function getViewerReviewForCourses(userId: string, courseIds: string[]) {
  if (courseIds.length === 0) {
    return null;
  }

  return prisma.review.findFirst({
    where: { userId, courseId: { in: courseIds } },
    select: { id: true, rating: true, comment: true, courseId: true },
  });
}

export async function canUserReviewProduct(userId: string, courseIds: string[]) {
  if (courseIds.length === 0) {
    return false;
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      courseId: { in: courseIds },
      status: "ACTIVE",
    },
    select: { id: true },
  });

  return !!enrollment;
}

export function validateReviewRating(rating: unknown): number {
  const value = typeof rating === "number" ? rating : Number(rating);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error("INVALID_RATING");
  }

  return value;
}

export function validateReviewComment(comment: unknown): string | null {
  if (comment == null || comment === "") {
    return null;
  }

  if (typeof comment !== "string") {
    throw new Error("INVALID_COMMENT");
  }

  const trimmed = comment.trim();
  if (trimmed.length > 1000) {
    throw new Error("COMMENT_TOO_LONG");
  }

  return trimmed || null;
}

export async function createCourseReview(params: {
  userId: string;
  courseId: string;
  rating: number;
  comment?: string | null;
}) {
  const canReview = await canUserReviewProduct(params.userId, [params.courseId]);
  if (!canReview) {
    throw new Error("NOT_ENROLLED");
  }

  const existing = await prisma.review.findUnique({
    where: {
      courseId_userId: {
        courseId: params.courseId,
        userId: params.userId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error("REVIEW_ALREADY_EXISTS");
  }

  return prisma.review.create({
    data: {
      courseId: params.courseId,
      userId: params.userId,
      rating: params.rating,
      comment: params.comment ?? null,
    },
    select: { id: true, createdAt: true },
  });
}
