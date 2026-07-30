"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MarkdownComposer } from "@/components/community/markdown-composer";
import { Typography } from "@/components/typography/typography";

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {parentPost && (
        <div className="app-feedback app-feedback--info" role="status">
          <Typography as="p" role="bodySecondary" weight="medium">
            부모 글에 연결됩니다
          </Typography>
          <Typography as="p" role="bodySecondary" color="secondary" className="mt-1">
            {parentPost.title}
          </Typography>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="post-title" className="typo-subTypography11 font-semibold text-[var(--color-text-primary)]">
          제목
        </label>
        <input
          id="post-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={parentPost ? "하위 글 제목" : "무엇을 공유하고 싶으신가요?"}
          maxLength={120}
          disabled={submitting}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 typo-subTypography10 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] shell-focus-ring disabled:opacity-60"
        />
      </div>

      <MarkdownComposer
        id="post-body"
        label="본문"
        value={bodyMarkdown}
        onChange={setBodyMarkdown}
        placeholder={"## 소제목\n\n내용을 Markdown으로 작성해 보세요."}
        minRows={14}
        disabled={submitting}
      />

      {error && (
        <div role="alert" className="app-feedback app-feedback--error">
          <Typography as="p" role="bodySecondary">
            {error}
          </Typography>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="app-btn app-btn--primary shell-focus-ring"
        >
          <Typography as="span" role="bodySecondary" weight="medium">
            {submitting ? "게시 중…" : parentPost ? "하위 글 게시" : "게시하기"}
          </Typography>
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => router.back()}
          className="app-btn app-btn--secondary shell-focus-ring"
        >
          <Typography as="span" role="bodySecondary" weight="medium">
            취소
          </Typography>
        </button>
      </div>
    </form>
  );
}
