"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type CommunityPostOwnerMenuProps = {
  slug: string;
  title: string;
  parentSlug?: string | null;
};

export function CommunityPostOwnerMenu({ slug, title, parentSlug }: CommunityPostOwnerMenuProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(`「${title}」 글을 삭제할까요?\n삭제한 글은 복구할 수 없습니다.`);
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/posts/${slug}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "글 삭제에 실패했습니다.");
        return;
      }

      router.push(parentSlug ? `/community/${parentSlug}` : "/community");
      router.refresh();
    });
  }

  return (
    <div className="community-post-owner-menu">
      <Link href={`/community/${slug}/edit`} className="community-post-owner-menu__edit shell-focus-ring">
        수정
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="community-post-owner-menu__delete shell-focus-ring"
      >
        {pending ? "삭제 중…" : "삭제"}
      </button>
      {error && (
        <p role="alert" className="community-post-owner-menu__error">
          {error}
        </p>
      )}
    </div>
  );
}
