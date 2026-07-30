import Link from "next/link";

import { formatPostDate } from "@/lib/post-content";
import { displayAuthorName, type PostListItem } from "@/lib/posts";

type PostListCardProps = {
  post: PostListItem;
};

export function PostListCard({ post }: PostListCardProps) {
  const publishedLabel = formatPostDate(post.publishedAt ?? post.createdAt);

  return (
    <Link
      href={`/community/${post.slug}`}
      className="shell-focus-ring group flex flex-col rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-sm transition hover:border-[var(--color-border-strong)] hover:shadow-md"
    >
      <div className="flex flex-1 flex-col gap-3">
        <div>
          <h2 className="typo-subTypography9 font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-action-primary)]">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="mt-2 line-clamp-3 typo-subTypography11 leading-relaxed text-[var(--color-text-secondary)]">
              {post.excerpt}
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 typo-subTypography12 text-[var(--color-text-secondary)]">
          <span className="font-medium text-[var(--color-text-primary)]">
            {displayAuthorName(post.user)}
          </span>
          <span aria-hidden="true">·</span>
          <time dateTime={(post.publishedAt ?? post.createdAt).toISOString()}>{publishedLabel}</time>
          <span aria-hidden="true">·</span>
          <span>조회 {post.viewCount.toLocaleString("ko-KR")}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-[var(--color-border)] pt-4 typo-subTypography12 font-medium text-[var(--color-text-secondary)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 ring-1 ring-[var(--color-border)] ring-inset">
          <HeartIcon filled={false} />
          {post.likeCount.toLocaleString("ko-KR")}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 ring-1 ring-[var(--color-border)] ring-inset">
          <CommentIcon />
          {post.commentCount.toLocaleString("ko-KR")}
        </span>
        {post.childPostCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 ring-1 ring-[var(--color-border)] ring-inset">
            하위 글 {post.childPostCount.toLocaleString("ko-KR")}
          </span>
        )}
      </div>
    </Link>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`size-3.5 ${filled ? "fill-[var(--color-action-primary)] text-[var(--color-action-primary)]" : "fill-none"}`}
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
  );
}

function CommentIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}
