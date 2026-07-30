"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type PostCommentLikeButtonProps = {
  postSlug: string;
  commentId: string;
  initialCount: number;
  initialLiked: boolean;
  isLoggedIn: boolean;
};

export function PostCommentLikeButton({
  postSlug,
  commentId,
  initialCount,
  initialLiked,
  isLoggedIn,
}: PostCommentLikeButtonProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function toggleLike() {
    if (!isLoggedIn) {
      router.push(`/login?next=/community/${postSlug}`);
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/posts/${postSlug}/comments/${commentId}/likes`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        liked?: boolean;
        likeCount?: number;
      };

      if (!response.ok) {
        return;
      }

      setLiked(data.liked ?? false);
      setCount(data.likeCount ?? count);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggleLike}
      disabled={pending}
      aria-pressed={liked}
      className="shell-focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-md)] px-2 py-1 typo-subTypography12 font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] disabled:opacity-60"
    >
      <svg
        aria-hidden="true"
        className={`size-3.5 ${liked ? "fill-[var(--color-action-primary)] text-[var(--color-action-primary)]" : "fill-none"}`}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <span>{count.toLocaleString("ko-KR")}</span>
    </button>
  );
}
