import Link from "next/link";

import { displayAuthorName } from "@/lib/post-display";
import type { PostListItem } from "@/lib/posts";

type CommunityPopularSidebarProps = {
  posts: PostListItem[];
};

export function CommunityPopularSidebar({ posts }: CommunityPopularSidebarProps) {
  return (
    <aside className="community-popular" aria-labelledby="community-popular-heading">
      <div className="community-popular__head">
        <h2 id="community-popular-heading" className="community-popular__title">
          이번주 인기글
        </h2>
      </div>

      {posts.length === 0 ? (
        <p className="community-popular__empty">이번 주 인기 글이 아직 없습니다.</p>
      ) : (
        <ol className="community-popular__list">
          {posts.map((post, index) => (
            <li key={post.id} className="community-popular__item">
              <Link href={`/community/${post.slug}`} className="community-popular__link shell-focus-ring">
                <span className="community-popular__rank" aria-hidden="true">
                  {index + 1}
                </span>

                <span className="community-popular__body">
                  <span className="community-popular__post-title">{post.title}</span>
                  <span className="community-popular__meta">
                    <span className="community-popular__author">{displayAuthorName(post.user)}</span>
                    <span className="community-popular__stats" aria-label={`좋아요 ${post.likeCount}, 댓글 ${post.commentCount}, 조회 ${post.viewCount}`}>
                      <span className="community-popular__stat">
                        <HeartIcon />
                        {post.likeCount.toLocaleString("ko-KR")}
                      </span>
                      <span className="community-popular__stat">
                        <CommentIcon />
                        {post.commentCount.toLocaleString("ko-KR")}
                      </span>
                      <span className="community-popular__stat">
                        <ViewIcon />
                        {post.viewCount.toLocaleString("ko-KR")}
                      </span>
                    </span>
                  </span>
                </span>

                <span className="sr-only">
                  {index + 1}위 — {post.title}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}
