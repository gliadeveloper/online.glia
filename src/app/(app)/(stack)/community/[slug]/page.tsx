import Link from "next/link";
import { notFound } from "next/navigation";

import { CommunityAuthorRow } from "@/components/community/community-author-row";
import { CommunityPostActions } from "@/components/community/community-post-actions";
import { PostChildList } from "@/components/community/post-child-list";
import { PostCommentComposer } from "@/components/community/post-comment-composer";
import { PostCommentList } from "@/components/community/post-comment-list";
import { PostMarkdown } from "@/components/community/post-markdown";
import { Typography } from "@/components/typography/typography";
import {
  getPublishedPostBySlug,
  incrementPostViewCount,
} from "@/lib/posts";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

type CommunityPostPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CommunityPostPage({ params }: CommunityPostPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const post = await getPublishedPostBySlug(slug, user?.id);

  if (!post) {
    notFound();
  }

  await incrementPostViewCount(post.id);

  const publishedAt = post.publishedAt ?? post.createdAt;
  const likedCommentIds = [...post.likedCommentIds];

  return (
    <div className="community-post-page">
      <StackNavTitle title={post.title} />

      {post.parentPost && (
        <Typography as="p" role="caption" color="secondary" className="community-post-page__parent">
          ↩{" "}
          <Link href={`/community/${post.parentPost.slug}`} className="community-post-page__parent-link shell-focus-ring">
            {post.parentPost.title}
          </Link>
        </Typography>
      )}

      <article className="community-post-detail">
        <CommunityAuthorRow
          user={post.user}
          publishedAt={publishedAt}
          headline={post.user.profile?.headline}
        />

        <Typography as="h1" role="pageTitle" weight="semibold" color="primary" className="community-post-detail__title">
          {post.title}
        </Typography>

        <div className="community-post-detail__body">
          <PostMarkdown content={post.bodyMarkdown} />
        </div>

        <CommunityPostActions
          postSlug={post.slug}
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          liked={post.likedByViewer}
          isLoggedIn={!!user}
          interactive
        />
      </article>

      <PostChildList parentSlug={post.slug} childPosts={post.childPosts} isLoggedIn={!!user} />

      <section id="post-comments" aria-labelledby="post-comments-heading" className="community-post-comments">
        <header className="community-post-comments__header">
          <Typography as="h2" id="post-comments-heading" role="label" weight="semibold" color="secondary">
            댓글 {post.commentCount.toLocaleString("ko-KR")}
          </Typography>
        </header>

        {post.comments.length === 0 ? (
          <Typography as="p" role="bodySecondary" color="secondary" className="community-post-comments__empty">
            아직 댓글이 없습니다. 첫 댓글을 남겨보세요.
          </Typography>
        ) : (
          <PostCommentList
            postSlug={post.slug}
            comments={post.comments}
            likedCommentIds={likedCommentIds}
            isLoggedIn={!!user}
          />
        )}
      </section>

      {user ? (
        <PostCommentComposer
          postSlug={post.slug}
          formId="post-comment-form"
          variant="dock"
          user={{ name: user.name, email: user.email }}
        />
      ) : (
        <div className="community-comment-dock community-comment-dock--guest">
          <Typography as="p" role="bodySecondary" color="secondary">
            댓글을 작성하려면{" "}
            <Link href={`/login?next=/community/${post.slug}`} className="community-post-page__parent-link shell-focus-ring">
              로그인
            </Link>
            이 필요합니다.
          </Typography>
        </div>
      )}
    </div>
  );
}
