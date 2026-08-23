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

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="glia-pdp__stars" aria-label={`${rating}점`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < rating ? "glia-pdp__stars--on" : "glia-pdp__stars--off"}>
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
    <section id="pdp-reviews" className="glia-pdp__section" aria-labelledby="pdp-reviews-heading">
      <div className="glia-pdp__section-head">
        <h2 id="pdp-reviews-heading" className="glia-pdp__section-title">
          리뷰
        </h2>
        <p className="glia-pdp__review-summary">
          {reviewCount > 0 ? (
            <>
              <StarRating rating={Math.round(averageRating)} />
              <span className="glia-pdp__review-score">{averageRating.toFixed(1)}</span>
            </>
          ) : null}
          <span>{reviewCount}개</span>
        </p>
      </div>

      {canReview && !hasExistingReview ? (
        <form onSubmit={handleSubmit} className="glia-pdp__review-form">
          <p className="glia-pdp__review-label">별점</p>
          <div className="glia-pdp__review-stars">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`glia-pdp__review-star${rating >= value ? " is-active" : ""}`}
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
            className="glia-pdp__review-textarea"
          />
          <button type="submit" disabled={pending} className="glia-pdp__review-submit">
            {pending ? "등록 중…" : "리뷰 등록"}
          </button>
          {error ? (
            <p role="alert" className="glia-pdp__error">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}

      {isLoggedIn && !canReview ? (
        <p className="glia-pdp__note">수강 중인 분만 리뷰를 작성할 수 있습니다.</p>
      ) : null}

      {reviews.length === 0 ? (
        <div className="glia-pdp__review-empty">
          <p className="glia-pdp__review-empty-title">아직 리뷰가 없습니다</p>
          <p className="glia-pdp__review-empty-hint">
            {canReview
              ? "수강 경험을 첫 리뷰로 남겨 주세요."
              : "수강을 시작한 분이 첫 기록을 남겨 주세요."}
          </p>
        </div>
      ) : (
        <ul className="glia-pdp__reviews">
          {reviews.map((review) => (
            <li key={review.id} className="glia-pdp__review">
              <div className="glia-pdp__review-top">
                <StarRating rating={review.rating} />
                <span className="glia-pdp__review-author">{formatReviewAuthor(review.user)}</span>
                <span className="glia-pdp__review-time">{formatRelativeTime(review.createdAt)}</span>
              </div>
              {review.comment ? (
                <p className="glia-pdp__review-body">{review.comment}</p>
              ) : (
                <p className="glia-pdp__review-body glia-pdp__review-body--muted">별점만 남긴 리뷰입니다.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
