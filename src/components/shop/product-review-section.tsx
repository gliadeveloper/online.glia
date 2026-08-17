"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formatReviewAuthor } from "@/lib/review-display";

type ProductReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  user: { name: string | null; email: string };
  course: { title: string };
};

type ProductReviewSectionProps = {
  productId: string;
  averageRating: number;
  reviewCount: number;
  reviews: ProductReview[];
  isLoggedIn: boolean;
  canReview: boolean;
  hasExistingReview: boolean;
};

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  return (
    <span className={`shop-pdp-stars shop-pdp-stars--${size}`} aria-label={`${rating}점`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < rating ? "shop-pdp-stars__on" : "shop-pdp-stars__off"}>
          ★
        </span>
      ))}
    </span>
  );
}

function formatRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "오늘";
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(months / 12)}년 전`;
}

export function ProductReviewSection({
  productId,
  averageRating,
  reviewCount,
  reviews,
  isLoggedIn,
  canReview,
  hasExistingReview,
}: ProductReviewSectionProps) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/shop/${productId}`)}`);
      return;
    }

    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "리뷰 저장에 실패했습니다.");
        return;
      }

      setComment("");
      router.refresh();
    });
  }

  return (
    <section id="pdp-reviews" className="shop-pdp-block" aria-labelledby="pdp-reviews-heading">
      <div className="shop-pdp-block__header-row">
        <h2 id="pdp-reviews-heading" className="shop-pdp-block__title">
          리뷰
        </h2>
        {reviewCount > 0 ? (
          <p className="shop-pdp-review-summary">
            <StarRating rating={Math.round(averageRating)} size="lg" />
            <span className="shop-pdp-review-summary__score">{averageRating.toFixed(1)}</span>
            <span className="shop-pdp-review-summary__count">{reviewCount}개</span>
          </p>
        ) : null}
      </div>

      {canReview && !hasExistingReview ? (
        <form onSubmit={handleSubmit} className="shop-pdp-review-form">
          <p className="shop-pdp-review-form__label">별점</p>
          <div className="shop-pdp-review-form__stars">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`shop-pdp-review-form__star${rating >= value ? " is-active" : ""}`}
                aria-label={`${value}점`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="수강 경험을 공유해 주세요 (선택)"
            rows={3}
            maxLength={1000}
            className="shop-pdp-review-form__textarea corp-trust-input corp-trust-focus shell-focus-ring"
          />
          <button
            type="submit"
            disabled={pending}
            className="shop-pdp-review-form__submit shell-focus-ring"
          >
            {pending ? "등록 중…" : "리뷰 등록"}
          </button>
          {error ? (
            <p role="alert" className="shop-pdp-review-form__error">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}

      {isLoggedIn && !canReview ? (
        <p className="shop-pdp-review-note">수강 중인 분만 리뷰를 작성할 수 있습니다.</p>
      ) : null}

      {reviews.length === 0 ? (
        <p className="shop-pdp-review-empty">아직 작성된 리뷰가 없어요.</p>
      ) : (
        <ul className="shop-pdp-review-grid">
          {reviews.map((review) => (
            <li key={review.id} className="shop-pdp-review-card">
              <div className="shop-pdp-review-card__top">
                <StarRating rating={review.rating} />
                <span className="shop-pdp-review-card__author">{formatReviewAuthor(review.user)}</span>
                <span className="shop-pdp-review-card__time">{formatRelativeTime(review.createdAt)}</span>
              </div>
              {review.comment ? (
                <p className="shop-pdp-review-card__body">{review.comment}</p>
              ) : (
                <p className="shop-pdp-review-card__body shop-pdp-review-card__body--muted">
                  별점만 남긴 리뷰입니다.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
