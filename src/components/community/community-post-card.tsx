import Link from "next/link";

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
      <div className="community-post-card__inner">
        <CommunityAuthorRow
          user={post.user}
          publishedAt={publishedAt}
          headline={post.user.profile?.headline}
        />

        <Link href={`/community/${post.slug}`} className="community-post-card__body shell-focus-ring">
          <h2 className="community-post-card__title">{post.title}</h2>

          {post.excerpt && <p className="community-post-card__excerpt">{post.excerpt}</p>}

          <span className="sr-only">{post.title} — 게시글 보기</span>
        </Link>

        <CommunityPostActions
          postSlug={post.slug}
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          viewCount={post.viewCount}
        />
      </div>
    </article>
  );
}
