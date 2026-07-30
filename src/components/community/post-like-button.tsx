"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Typography } from "@/components/typography/typography";

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
          <Typography as="span" role="caption" color="secondary">
            {count.toLocaleString("ko-KR")}
          </Typography>
          <span className="sr-only">{liked ? "좋아요 취소" : "좋아요"}</span>
        </button>
        {error && (
          <p role="alert" className="community-post-actions__error">
            <Typography as="span" role="caption" color="secondary">
              {error}
            </Typography>
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
        className="shell-focus-ring inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2 typo-subTypography11 font-medium text-[var(--color-text-primary)] transition hover:border-[var(--color-border-strong)] disabled:opacity-60"
      >
        <HeartIcon filled={liked} />
        <span>{liked ? "좋아요 취소" : "좋아요"}</span>
        <span className="text-[var(--color-text-secondary)]">{count.toLocaleString("ko-KR")}</span>
      </button>
      {error && (
        <p role="alert" className="typo-subTypography12 text-red-600 dark:text-red-400">
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
      className={`community-post-actions__icon${filled ? " community-post-actions__icon--active" : ""}`}
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
