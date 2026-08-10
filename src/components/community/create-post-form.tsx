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
    <form onSubmit={handleSubmit} className="community-write-form">
      {parentPost && (
        <div className="community-write-form__parent">
          <span className="community-write-form__parent-label">부모 글</span>
          <Link href={`/community/${parentPost.slug}`} className="community-write-form__parent-link">
            {parentPost.title}
          </Link>
        </div>
      )}

      <div className="community-write-form__field">
        <label htmlFor="post-title" className="community-write-form__label">
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
          className="community-write-form__title-input corp-trust-focus shell-focus-ring"
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
        <p role="alert" className="community-write-form__error">
          {error}
        </p>
      )}

      <div className="community-write-form__actions">
        <button
          type="submit"
          disabled={submitting}
          className="community-write-form__submit shell-focus-ring"
        >
          {submitting ? "게시 중…" : parentPost ? "하위 글 게시" : "게시하기"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => router.back()}
          className="community-write-form__cancel shell-focus-ring"
        >
          취소
        </button>
      </div>
    </form>
  );
}
