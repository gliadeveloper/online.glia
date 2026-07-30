"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CommunityAvatar } from "@/components/community/community-avatar";
import { Typography } from "@/components/typography/typography";

type PostCommentComposerProps = {
  postSlug: string;
  formId?: string;
  variant?: "default" | "dock";
  user?: { name: string | null; email: string };
};

export function PostCommentComposer({
  postSlug,
  formId,
  variant = "default",
  user,
}: PostCommentComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/posts/${postSlug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "댓글 저장에 실패했습니다.");
        return;
      }

      setBody("");
      router.refresh();
    } catch {
      setError("댓글 저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (variant === "dock") {
    return (
      <div className="community-comment-dock">
        <form id={formId} onSubmit={handleSubmit} className="community-comment-dock__form">
          {user && <CommunityAvatar user={user} size="sm" />}
          <label htmlFor={`comment-${postSlug}`} className="sr-only">
            댓글
          </label>
          <input
            id={`comment-${postSlug}`}
            type="text"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="댓글로 의견을 남겨보세요"
            maxLength={2000}
            disabled={submitting}
            className="community-comment-dock__input shell-focus-ring"
          />
          <button
            type="submit"
            disabled={submitting || body.trim().length === 0}
            className="community-comment-dock__send shell-focus-ring"
            aria-label="댓글 등록"
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </form>
        {error && (
          <p role="alert" className="community-comment-dock__error">
            <Typography as="span" role="caption" color="secondary">
              {error}
            </Typography>
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="community-comment-form"
    >
      <label htmlFor={`comment-${postSlug}`} className="sr-only">
        댓글
      </label>
      <textarea
        id={`comment-${postSlug}`}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="댓글을 입력하세요."
        rows={3}
        maxLength={2000}
        disabled={submitting}
        className="community-comment-form__textarea shell-focus-ring"
      />

      <div className="community-comment-form__footer">
        <Typography as="p" role="caption" color="secondary">
          {body.length.toLocaleString("ko-KR")} / 2,000
        </Typography>
        <button
          type="submit"
          disabled={submitting || body.trim().length === 0}
          className="community-comment-form__submit shell-focus-ring"
        >
          <Typography as="span" role="bodySecondary" weight="medium">
            {submitting ? "등록 중…" : "댓글 등록"}
          </Typography>
        </button>
      </div>

      {error && (
        <p role="alert" className="community-comment-form__error">
          <Typography as="span" role="bodySecondary" color="secondary">
            {error}
          </Typography>
        </p>
      )}
    </form>
  );
}
