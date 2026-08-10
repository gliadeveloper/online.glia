import Link from "next/link";

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
        <h2 id="child-posts-heading" className="community-related-posts__title">
          하위 글
          {childPosts.length > 0 && (
            <span className="community-related-posts__count">{childPosts.length.toLocaleString("ko-KR")}</span>
          )}
        </h2>

        <Link href={writeHref} className="community-related-posts__write shell-focus-ring">
          <svg
            width={14}
            height={14}
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
          작성하기
        </Link>
      </div>

      {childPosts.length === 0 ? (
        <div className="community-related-posts__empty">
          <p>이 글에 연결된 하위 글이 아직 없습니다.</p>
          <Link href={writeHref} className="community-related-posts__write-cta shell-focus-ring">
            {writeLabel}
          </Link>
        </div>
      ) : (
        <ul className="community-related-posts__list">
          {childPosts.map((child) => (
            <li key={child.id}>
              <Link href={`/community/${child.slug}`} className="community-related-posts__row shell-focus-ring">
                <span className="community-related-posts__row-title">{child.title}</span>
                <time
                  className="community-related-posts__row-date"
                  dateTime={(child.publishedAt ?? child.createdAt).toISOString()}
                >
                  {formatPostDate(child.publishedAt ?? child.createdAt)}
                </time>
                <span className="sr-only">{child.title} — 하위 글 보기</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
