import { Typography } from "@/components/typography/typography";

import { PostLikeButton } from "./post-like-button";

type CommunityPostActionsProps = {
  postSlug: string;
  likeCount: number;
  commentCount: number;
  liked?: boolean;
  isLoggedIn?: boolean;
  interactive?: boolean;
};

export function CommunityPostActions({
  postSlug,
  likeCount,
  commentCount,
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
        <span className="community-post-actions__stat" aria-hidden="true">
          <HeartIcon filled={false} />
          <Typography as="span" role="caption" color="secondary">
            {likeCount.toLocaleString("ko-KR")}
          </Typography>
        </span>
      )}

      {interactive ? (
        <a href="#post-comments" className="community-post-actions__stat shell-focus-ring">
          <CommentIcon />
          <Typography as="span" role="caption" color="secondary">
            {commentCount.toLocaleString("ko-KR")}
          </Typography>
          <span className="sr-only">댓글 보기</span>
        </a>
      ) : (
        <span className="community-post-actions__stat" aria-hidden="true">
          <CommentIcon />
          <Typography as="span" role="caption" color="secondary">
            {commentCount.toLocaleString("ko-KR")}
          </Typography>
        </span>
      )}

      <span className="community-post-actions__spacer" aria-hidden="true" />

      {interactive && (
        <button type="button" className="community-post-actions__more shell-focus-ring" aria-label="더보기">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx={5} cy={12} r={2} />
            <circle cx={12} cy={12} r={2} />
            <circle cx={19} cy={12} r={2} />
          </svg>
        </button>
      )}
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
