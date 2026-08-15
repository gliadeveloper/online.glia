import Link from "next/link";
import { notFound } from "next/navigation";

import { CommunityAuthorRow } from "@/components/community/community-author-row";
import { CommunityPostActions } from "@/components/community/community-post-actions";
import { CommunityPostOwnerMenu } from "@/components/community/community-post-owner-menu";
import { CommunityReportButton } from "@/components/community/community-report-button";
import { PostChildList } from "@/components/community/post-child-list";
import { PostCommentComposer } from "@/components/community/post-comment-composer";
import { PostCommentList } from "@/components/community/post-comment-list";
import { PostMarkdown } from "@/components/community/post-markdown";
import { PostViewRecorder } from "@/components/community/post-view-recorder";
import { getPublishedPostBySlug } from "@/lib/posts";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

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

  const publishedAt = post.publishedAt ?? post.createdAt;
  const likedCommentIds = [...post.likedCommentIds];
  const isOwner = user?.id === post.user.id;

  return (
    <div className="community-post-page">
      <PostViewRecorder slug={post.slug} />
      <StackNavTitle title={post.title} />

      {post.parentPost && (
        <p className="community-post-page__parent">
          ↩{" "}
          <Link href={`/community/${post.parentPost.slug}`} className="community-post-page__parent-link">
            {post.parentPost.title}
          </Link>
        </p>
      )}

      <article className="community-post-detail">
        <div className="community-post-detail__top">
          <CommunityAuthorRow
            user={post.user}
            publishedAt={publishedAt}
            headline={post.user.profile?.headline}
          />

          {isOwner && (
            <CommunityPostOwnerMenu
              slug={post.slug}
              title={post.title}
              parentSlug={post.parentPost?.slug}
            />
          )}
          {!isOwner && (
            <CommunityReportButton
              targetType="POST"
              postSlug={post.slug}
              isLoggedIn={!!user}
            />
          )}
        </div>

        <h1 className="community-post-detail__title">
          {post.title}
          {post.editedAt && <span className="community-post-detail__edited"> · 수정됨</span>}
        </h1>

        <div className="community-post-detail__body">
          <PostMarkdown content={post.bodyMarkdown} />
        </div>
      </article>

      {!post.parentPost && (
        <PostChildList parentSlug={post.slug} childPosts={post.childPosts} isLoggedIn={!!user} />
      )}

      <div className="community-post-page__actions">
        <CommunityPostActions
          postSlug={post.slug}
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          viewCount={post.viewCount}
          liked={post.likedByViewer}
          isLoggedIn={!!user}
          interactive
        />
      </div>

      <section id="post-comments" aria-labelledby="post-comments-heading" className="community-post-comments">
        <h2 id="post-comments-heading" className="sr-only">
          댓글
        </h2>

        {user ? (
          <PostCommentComposer
            postSlug={post.slug}
            formId="post-comment-form"
            variant="inline"
            user={{ name: user.name, email: user.email }}
          />
        ) : (
          <div className="community-comment-inline community-comment-inline--guest">
            <p>
              <Link href={`/login?next=/community/${post.slug}`} className="community-post-page__parent-link">
                로그인
              </Link>
              {" "}
              하신 후 댓글을 작성해 보세요.
            </p>
          </div>
        )}

        {post.comments.length === 0 ? (
          <p className="community-post-comments__empty">아직 작성된 댓글이 없어요.</p>
        ) : (
          <PostCommentList
            postSlug={post.slug}
            comments={post.comments}
            likedCommentIds={likedCommentIds}
            isLoggedIn={!!user}
            viewerUserId={user?.id}
          />
        )}
      </section>
    </div>
  );
}
