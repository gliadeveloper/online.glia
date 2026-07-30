import { PostCommentLikeButton } from "@/components/community/post-comment-like-button";
import { CommunityAvatar } from "@/components/community/community-avatar";
import { Typography } from "@/components/typography/typography";
import { formatPostRelativeTime } from "@/lib/post-content";
import { displayAuthorName, type PostCommentItem } from "@/lib/post-display";

type PostCommentListProps = {
  postSlug: string;
  comments: PostCommentItem[];
  likedCommentIds: string[];
  isLoggedIn: boolean;
};

export function PostCommentList({
  postSlug,
  comments,
  likedCommentIds,
  isLoggedIn,
}: PostCommentListProps) {
  if (comments.length === 0) {
    return null;
  }

  return (
    <ul className="community-comment-list">
      {comments.map((comment) => (
        <li key={comment.id}>
          <article className="community-comment-item">
            <CommunityAvatar user={comment.user} size="sm" />
            <div className="community-comment-item__body">
              <header className="community-comment-item__header">
                <Typography as="p" role="bodyCompact" weight="semibold" color="primary">
                  {displayAuthorName(comment.user)}
                </Typography>
                <Typography as="p" role="caption" color="secondary">
                  <time dateTime={comment.createdAt.toISOString()}>
                    {formatPostRelativeTime(comment.createdAt)}
                  </time>
                </Typography>
              </header>

              <Typography
                as="p"
                role="bodySecondary"
                color="primary"
                className="community-comment-item__text"
              >
                {comment.bodyMarkdown}
              </Typography>

              <footer className="community-comment-item__footer">
                <PostCommentLikeButton
                  postSlug={postSlug}
                  commentId={comment.id}
                  initialCount={comment.likeCount}
                  initialLiked={likedCommentIds.includes(comment.id)}
                  isLoggedIn={isLoggedIn}
                />
              </footer>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
