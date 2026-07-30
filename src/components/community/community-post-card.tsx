import Link from "next/link";

import { Typography } from "@/components/typography/typography";
import type { PostListItem } from "@/lib/posts";

import { CommunityAuthorRow } from "./community-author-row";
import { CommunityPostActions } from "./community-post-actions";

type CommunityPostCardProps = {
  post: PostListItem;
};

export function CommunityPostCard({ post }: CommunityPostCardProps) {
  const publishedAt = post.publishedAt ?? post.createdAt;

  return (
    <article className="community-post-card">
      <Link href={`/community/${post.slug}`} className="community-post-card__link shell-focus-ring">
        <CommunityAuthorRow
          user={post.user}
          publishedAt={publishedAt}
          headline={post.user.profile?.headline}
        />

        <Typography
          as="h2"
          role="sectionTitle"
          weight="semibold"
          color="primary"
          className="community-post-card__title"
        >
          {post.title}
        </Typography>

        {post.excerpt && (
          <Typography
            as="p"
            role="bodySecondary"
            color="secondary"
            className="community-post-card__excerpt"
          >
            {post.excerpt}
          </Typography>
        )}

        <span className="sr-only">{post.title} — 게시글 보기</span>
      </Link>

      <CommunityPostActions
        postSlug={post.slug}
        likeCount={post.likeCount}
        commentCount={post.commentCount}
      />
    </article>
  );
}
