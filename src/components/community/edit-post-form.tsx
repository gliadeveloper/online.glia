"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MarkdownComposer } from "@/components/community/markdown-composer";

type EditPostFormProps = {
  slug: string;
  initialTitle: string;
  initialBodyMarkdown: string;
};

export function EditPostForm({ slug, initialTitle, initialBodyMarkdown }: EditPostFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [bodyMarkdown, setBodyMarkdown] = useState(initialBodyMarkdown);
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
      const response = await fetch(`/api/posts/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, bodyMarkdown }),
      });

      const data = (await response.json()) as { slug?: string; error?: string };

      if (!response.ok) {
        setError(data.error ?? "글 수정에 실패했습니다.");
        return;
      }

      router.push(`/community/${data.slug ?? slug}`);
      router.refresh();
    } catch {
      setError("글 수정에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="community-write-form">
      <div className="community-write-form__field">
        <label htmlFor="edit-post-title" className="community-write-form__label">
          제목
        </label>
        <input
          id="edit-post-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          disabled={submitting}
          className="community-write-form__title-input corp-trust-focus shell-focus-ring"
        />
      </div>

      <MarkdownComposer
        id="edit-post-body"
        label="본문"
        value={bodyMarkdown}
        onChange={setBodyMarkdown}
        minRows={16}
        disabled={submitting}
      />

      {error && (
        <p role="alert" className="community-write-form__error">
          {error}
        </p>
      )}

      <div className="community-write-form__actions">
        <button type="submit" disabled={submitting} className="community-write-form__submit shell-focus-ring">
          {submitting ? "저장 중…" : "변경 저장"}
        </button>
        <Link href={`/community/${slug}`} className="community-write-form__cancel shell-focus-ring">
          취소
        </Link>
      </div>
    </form>
  );
}
