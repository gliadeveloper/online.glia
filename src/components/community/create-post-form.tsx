"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MarkdownComposer } from "@/components/community/markdown-composer";

type CreatePostFormProps = {
  parentPost?: {
    slug: string;
    title: string;
  };
};

export function CreatePostForm({ parentPost }: CreatePostFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [bodyMarkdown, setBodyMarkdown] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (title.trim().length < 2) {
      setError("제목을 2자 이상 입력해 주세요.");
      return;
    }

    if (bodyMarkdown.trim().length < 8) {
      setError("본문을 8자 이상 입력해 주세요.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          bodyMarkdown,
          parentPostSlug: parentPost?.slug ?? null,
        }),
      });

      const data = (await response.json()) as { slug?: string; error?: string };

      if (!response.ok) {
        setError(data.error ?? "글 저장에 실패했습니다.");
        return;
      }

      router.push(`/community/${data.slug}`);
      router.refresh();
    } catch {
      setError("글 저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glia-write__form">
      {parentPost && (
        <div className="glia-write__parent">
          <span className="glia-write__parent-label">원본 글</span>
          <Link href={`/community/${parentPost.slug}`} className="glia-write__parent-link">
            <ParentIcon />
            {parentPost.title}
          </Link>
        </div>
      )}

      <div className="glia-write__field">
        <label htmlFor="post-title" className="glia-write__label">
          제목
        </label>
        <input
          id="post-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={parentPost ? "인증 글 제목" : "무엇을 공유하고 싶으신가요?"}
          maxLength={120}
          disabled={submitting}
          className="glia-write__input"
        />
      </div>

      <MarkdownComposer
        id="post-body"
        label="본문"
        value={bodyMarkdown}
        onChange={setBodyMarkdown}
        placeholder={"## 소제목\n\n내용을 Markdown으로 작성해 보세요."}
        minRows={16}
        disabled={submitting}
      />

      {error && (
        <p role="alert" className="glia-write__error">
          <ErrorIcon />
          {error}
        </p>
      )}

      <div className="glia-write__actions">
        <button type="submit" disabled={submitting} className="glia-write__submit">
          {submitting ? "게시 중…" : parentPost ? "인증 글 게시" : "게시하기"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => router.back()}
          className="glia-write__cancel"
        >
          취소
        </button>
      </div>
    </form>
  );
}

function ParentIcon() {
  return (
    <svg
      aria-hidden="true"
      className="glia-write__parent-icon"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 6 6v5" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      aria-hidden="true"
      className="glia-write__error-icon"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}
