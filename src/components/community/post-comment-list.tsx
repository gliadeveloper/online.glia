import { PostCommentItemView } from "@/components/community/post-comment-item";
import type { PostCommentItem } from "@/lib/post-display";

type PostCommentListProps = {
  postSlug: string;
  comments: PostCommentItem[];
  likedCommentIds: string[];
  isLoggedIn: boolean;
  viewerUserId?: string;
};

export function PostCommentList({
  postSlug,
  comments,
  likedCommentIds,
  isLoggedIn,
  viewerUserId,
}: PostCommentListProps) {
  if (comments.length === 0) {
    return null;
  }

  return (
    <ul className="community-comment-list">
      {comments.map((comment) => (
        <li key={comment.id}>
          <PostCommentItemView
            postSlug={postSlug}
            comment={comment}
            liked={likedCommentIds.includes(comment.id)}
            likedCommentIds={likedCommentIds}
            isLoggedIn={isLoggedIn}
            viewerUserId={viewerUserId}
          />
        </li>
      ))}
    </ul>
  );
}
