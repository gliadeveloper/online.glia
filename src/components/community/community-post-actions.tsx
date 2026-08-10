import Link from "next/link";

import { PostLikeButton } from "./post-like-button";

type CommunityPostActionsProps = {
  postSlug: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  liked?: boolean;
  isLoggedIn?: boolean;
  interactive?: boolean;
};

export function CommunityPostActions({
  postSlug,
  likeCount,
  commentCount,
  viewCount,
  liked = false,
  isLoggedIn = false,
  interactive = false,
}: CommunityPostActionsProps) {
  return (
    <div className="community-post-actions">
      {interactive ? (
        <PostLikeButton
          postSlug={postSlug}
          initialCount={likeCount}
          initialLiked={liked}
          isLoggedIn={isLoggedIn}
          layout="compact"
        />
      ) : (
        <span className="community-post-actions__stat">
          <HeartIcon filled={false} />
          <span>{likeCount.toLocaleString("ko-KR")}</span>
        </span>
      )}

      {interactive ? (
        <a
          href="#post-comments"
          className="community-post-actions__stat community-post-actions__stat--button shell-focus-ring"
        >
          <CommentIcon />
          <span>{commentCount.toLocaleString("ko-KR")}</span>
          <span className="sr-only">댓글 보기</span>
        </a>
      ) : (
        <Link href={`/community/${postSlug}#post-comments`} className="community-post-actions__stat shell-focus-ring">
          <CommentIcon />
          <span>{commentCount.toLocaleString("ko-KR")}</span>
          <span className="sr-only">댓글 보기</span>
        </Link>
      )}

      <span className="community-post-actions__stat" aria-label={`조회 ${viewCount.toLocaleString("ko-KR")}`}>
        <ViewIcon />
        <span>{viewCount.toLocaleString("ko-KR")}</span>
      </span>
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`community-post-actions__icon${filled ? " community-post-actions__icon--active" : ""}`}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
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
    <svg
      aria-hidden="true"
      className="community-post-actions__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
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
    <svg
      aria-hidden="true"
      className="community-post-actions__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}
