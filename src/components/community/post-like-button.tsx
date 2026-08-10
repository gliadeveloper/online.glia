"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type PostLikeButtonProps = {
  postSlug: string;
  initialCount: number;
  initialLiked: boolean;
  isLoggedIn: boolean;
  layout?: "default" | "compact";
};

export function PostLikeButton({
  postSlug,
  initialCount,
  initialLiked,
  isLoggedIn,
  layout = "default",
}: PostLikeButtonProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleLike() {
    if (!isLoggedIn) {
      router.push(`/login?next=/community/${postSlug}`);
      return;
    }

    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/posts/${postSlug}/likes`, { method: "POST" });
      const data = (await response.json()) as {
        liked?: boolean;
        likeCount?: number;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "좋아요 처리에 실패했습니다.");
        return;
      }

      setLiked(data.liked ?? false);
      setCount(data.likeCount ?? count);
      router.refresh();
    });
  }

  if (layout === "compact") {
    return (
      <div className="community-post-actions__like-wrap">
        <button
          type="button"
          onClick={toggleLike}
          disabled={pending}
          aria-pressed={liked}
          className="community-post-actions__stat community-post-actions__stat--button shell-focus-ring"
        >
          <HeartIcon filled={liked} />
          <span className="text-xs text-slate-600">{count.toLocaleString("ko-KR")}</span>
          <span className="sr-only">{liked ? "좋아요 취소" : "좋아요"}</span>
        </button>
        {error && (
          <p role="alert" className="community-post-actions__error text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggleLike}
        disabled={pending}
        aria-pressed={liked}
        className={`trust-like-btn shell-focus-ring inline-flex min-h-11 items-center gap-2${liked ? " trust-like-btn--active" : ""}`}
      >
        <HeartIcon filled={liked} />
        <span>{liked ? "좋아요 취소" : "좋아요"}</span>
        <span className="opacity-70">{count.toLocaleString("ko-KR")}</span>
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`community-post-actions__icon size-[1.125rem]${filled ? " community-post-actions__icon--active" : ""}`}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}
