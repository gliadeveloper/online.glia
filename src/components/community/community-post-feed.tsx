import { Typography } from "@/components/typography/typography";

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
        <Typography as="h2" id={headingId} className="sr-only">
          게시글 목록
        </Typography>
        <Typography as="p" role="bodySecondary" color="secondary">
          아직 게시글이 없습니다.
        </Typography>
        <Typography as="p" role="caption" color="secondary" className="community-feed__empty-hint">
          우측 아래 버튼으로 첫 글을 작성해 보세요.
        </Typography>
      </section>
    );
  }

  return (
    <section aria-labelledby={headingId} className="community-feed__list">
      <Typography as="h2" id={headingId} className="sr-only">
        게시글 목록
      </Typography>
      {posts.map((post) => (
        <CommunityPostCard key={post.id} post={post} />
      ))}
    </section>
  );
}
