import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import {
  createCourseReview,
  getProductCourseIds,
  getProductReviews,
  getProductReviewSummary,
  validateReviewComment,
  validateReviewRating,
} from "@/lib/course-reviews";
import { getProductBySlug } from "@/lib/shop-products";
import { assertRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function mapReviewError(code: string) {
  switch (code) {
    case "INVALID_RATING":
      return "별점은 1~5 사이로 선택해 주세요.";
    case "INVALID_COMMENT":
    case "COMMENT_TOO_LONG":
      return "리뷰 내용을 확인해 주세요.";
    case "NOT_ENROLLED":
      return "수강 중인 분만 리뷰를 작성할 수 있습니다.";
    case "REVIEW_ALREADY_EXISTS":
      return "이미 리뷰를 작성하셨습니다.";
    default:
      return "리뷰 저장에 실패했습니다.";
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const product = await getProductBySlug(slug);

    if (!product) {
      throw new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    const courseIds = getProductCourseIds(product.items);
    const [summary, reviews] = await Promise.all([
      getProductReviewSummary(courseIds),
      getProductReviews(courseIds, 12),
    ]);

    return NextResponse.json({ summary, reviews });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("Login required", 401, "UNAUTHORIZED");
    }

    assertRateLimit(`product:review:${userId}`, 5, 60_000);

    const { slug } = await context.params;
    const product = await getProductBySlug(slug);

    if (!product) {
      throw new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    const body = (await request.json()) as {
      rating?: number;
      comment?: string;
      courseId?: string;
    };

    const courseIds = getProductCourseIds(product.items);
    const courseId = body.courseId && courseIds.includes(body.courseId)
      ? body.courseId
      : courseIds[0];

    if (!courseId) {
      throw new ApiError("This product has no reviewable course", 400, "NO_COURSE");
    }

    const review = await createCourseReview({
      userId,
      courseId,
      rating: validateReviewRating(body.rating),
      comment: validateReviewComment(body.comment),
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message, code: "RATE_LIMITED" }, { status: 429 });
    }

    if (error instanceof ApiError) {
      return jsonError(error);
    }

    if (error instanceof Error) {
      const status =
        error.message === "NOT_ENROLLED" || error.message === "REVIEW_ALREADY_EXISTS" ? 409 : 400;
      return NextResponse.json(
        { error: mapReviewError(error.message), code: error.message },
        { status },
      );
    }

    return jsonError(error);
  }
}
