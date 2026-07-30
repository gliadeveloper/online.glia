import Link from "next/link";

import { Typography } from "@/components/typography/typography";
import { formatPostDate } from "@/lib/post-content";
import { type PostSummary } from "@/lib/post-display";

type PostChildListProps = {
  parentSlug: string;
  childPosts: PostSummary[];
  isLoggedIn: boolean;
};

function childPostWriteHref(parentSlug: string, isLoggedIn: boolean) {
  const next = `/community/new?parent=${encodeURIComponent(parentSlug)}`;
  return isLoggedIn ? next : `/login?next=${encodeURIComponent(next)}`;
}

export function PostChildList({ parentSlug, childPosts, isLoggedIn }: PostChildListProps) {
  const writeHref = childPostWriteHref(parentSlug, isLoggedIn);
  const writeLabel = isLoggedIn ? "하위 글 작성하기" : "로그인 후 하위 글 작성";

  return (
    <section aria-labelledby="child-posts-heading" className="community-related-posts">
      <div className="community-related-posts__header">
        <Typography
          as="h2"
          id="child-posts-heading"
          role="label"
          weight="semibold"
          color="secondary"
          className="community-related-posts__title"
        >
          하위 글
          {childPosts.length > 0 && (
            <Typography as="span" role="caption" color="secondary" className="community-related-posts__count">
              {" "}
              {childPosts.length.toLocaleString("ko-KR")}
            </Typography>
          )}
        </Typography>

        <Link href={writeHref} className="community-related-posts__write shell-focus-ring">
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <Typography as="span" role="caption" weight="medium">
            작성하기
          </Typography>
        </Link>
      </div>

      {childPosts.length === 0 ? (
        <div className="community-related-posts__empty">
          <Typography as="p" role="bodySecondary" color="secondary">
            이 글에 연결된 하위 글이 아직 없습니다.
          </Typography>
          <Link href={writeHref} className="community-related-posts__write-cta shell-focus-ring">
            {writeLabel}
          </Link>
        </div>
      ) : (
        <div className="community-related-posts__scroll" role="list">
          {childPosts.map((child) => (
            <Link
              key={child.id}
              href={`/community/${child.slug}`}
              role="listitem"
              className="community-related-posts__card shell-focus-ring"
            >
              <Typography as="p" role="caption" color="secondary">
                {formatPostDate(child.publishedAt ?? child.createdAt)}
              </Typography>
              <Typography
                as="p"
                role="bodyCompact"
                weight="semibold"
                color="primary"
                className="community-related-posts__card-title"
              >
                {child.title}
              </Typography>
              {child.excerpt && (
                <Typography as="p" role="caption" color="secondary" className="community-related-posts__card-excerpt">
                  {child.excerpt}
                </Typography>
              )}
            </Link>
          ))}

          <Link
            href={writeHref}
            role="listitem"
            className="community-related-posts__card community-related-posts__card--write shell-focus-ring"
            aria-label={writeLabel}
          >
            <span className="community-related-posts__card-write-icon" aria-hidden="true">
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <Typography as="p" role="bodyCompact" weight="semibold" color="primary">
              하위 글 작성
            </Typography>
          </Link>
        </div>
      )}
    </section>
  );
}
