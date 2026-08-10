import { CommunityPostCard } from "./community-post-card";
import type { PostListItem } from "@/lib/posts";

type CommunityPostFeedProps = {
  posts: PostListItem[];
};

export function CommunityPostFeed({ posts }: CommunityPostFeedProps) {
  const headingId = "community-post-feed-heading";

  if (posts.length === 0) {
    return (
      <section aria-labelledby={headingId} className="community-feed__empty">
        <h2 id={headingId} className="sr-only">
          게시글 목록
        </h2>
        <p className="community-feed__empty-title">아직 게시글이 없습니다</p>
        <p className="community-feed__empty-hint">우측 아래 버튼으로 첫 글을 작성해 보세요.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby={headingId} className="community-feed__list">
      <h2 id={headingId} className="sr-only">
        게시글 목록
      </h2>
      {posts.map((post) => (
        <CommunityPostCard key={post.id} post={post} />
      ))}
    </section>
  );
}
