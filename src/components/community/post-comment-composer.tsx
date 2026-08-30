"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { TrustButton, TrustTextarea } from "@/components/corporate-trust/app-trust-ui";
import { CommunityAvatar } from "@/components/community/community-avatar";
import { Typography } from "@/components/typography/typography";

type PostCommentComposerProps = {
  postSlug: string;
  parentCommentId?: string | null;
  formId?: string;
  variant?: "default" | "dock" | "inline";
  user?: {
    name: string | null;
    email: string;
    profile?: { avatarUrl?: string | null } | null;
  };
  onSubmitted?: () => void;
};

export function PostCommentComposer({
  postSlug,
  parentCommentId = null,
  formId,
  variant = "default",
  user,
  onSubmitted,
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
        body: JSON.stringify({ body, parentCommentId }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "댓글 저장에 실패했습니다.");
        return;
      }

      setBody("");
      onSubmitted?.();
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
            placeholder={parentCommentId ? "답글을 입력하세요" : "댓글로 의견을 남겨보세요"}
            maxLength={2000}
            disabled={submitting}
            className="community-comment-dock__input corp-trust-input corp-trust-focus shell-focus-ring"
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
            {error}
          </p>
        )}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="community-comment-inline">
        <form id={formId} onSubmit={handleSubmit} className="community-comment-inline__form">
          {user && <CommunityAvatar user={user} size="sm" />}
          <label htmlFor={`comment-${postSlug}`} className="sr-only">
            댓글
          </label>
          <input
            id={`comment-${postSlug}`}
            type="text"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={parentCommentId ? "답글을 입력하세요" : "댓글로 의견을 남겨보세요"}
            maxLength={2000}
            disabled={submitting}
            className="community-comment-inline__input corp-trust-input corp-trust-focus shell-focus-ring"
          />
          <button
            type="submit"
            disabled={submitting || body.trim().length === 0}
            className="community-comment-inline__send shell-focus-ring"
            aria-label="댓글 등록"
          >
            등록
          </button>
        </form>
        {error && (
          <p role="alert" className="community-comment-inline__error">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="community-comment-form">
      <label htmlFor={`comment-${postSlug}`} className="sr-only">
        댓글
      </label>
      <TrustTextarea
        id={`comment-${postSlug}`}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="댓글을 입력하세요."
        rows={3}
        maxLength={2000}
        disabled={submitting}
      />

      <div className="community-comment-form__footer">
        <Typography as="p" role="caption" color="secondary">
          {body.length.toLocaleString("ko-KR")} / 2,000
        </Typography>
        <TrustButton type="submit" variant="primary" disabled={submitting || body.trim().length === 0}>
          {submitting ? "등록 중…" : "댓글 등록"}
        </TrustButton>
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
