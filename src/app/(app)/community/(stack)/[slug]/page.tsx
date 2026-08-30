import type { Metadata } from "next";
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
import { JsonLd } from "@/components/seo/json-ld";
import { firstMarkdownImage } from "@/lib/post-content";
import { displayAuthorName } from "@/lib/post-display";
import { getPublishedPostBySlug, getPublishedPostShareBySlug } from "@/lib/posts";
import {
  absoluteUrl,
  buildPageMetadata,
  communityOgImages,
  toOgImage,
} from "@/lib/site-metadata";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

import "@/components/community/community-post-glia.css";

export const dynamic = "force-dynamic";

type CommunityPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: CommunityPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostShareBySlug(slug);
  if (!post) notFound();

  const description = post.excerpt?.trim() || post.title;
  const cover = firstMarkdownImage(post.bodyMarkdown);
  const authorName = displayAuthorName(post.user);

  return buildPageMetadata({
    title: post.title,
    description,
    path: `/community/${post.slug}`,
    type: "article",
    images: cover ? [toOgImage(cover, post.title)] : communityOgImages,
    article: {
      publishedTime: (post.publishedAt ?? post.updatedAt).toISOString(),
      modifiedTime: (post.editedAt ?? post.updatedAt).toISOString(),
      authors: [authorName],
      section: post.parentPostId ? "인증 글" : "커뮤니티",
    },
  });
}

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
  const cover = firstMarkdownImage(post.bodyMarkdown);
  const shareImage = cover ? toOgImage(cover, post.title) : communityOgImages[0];

  return (
    <div className="glia-post">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt ?? post.title,
          datePublished: publishedAt.toISOString(),
          dateModified: (post.editedAt ?? post.updatedAt).toISOString(),
          author: { "@type": "Person", name: displayAuthorName(post.user) },
          image: absoluteUrl(shareImage.url),
          mainEntityOfPage: absoluteUrl(`/community/${post.slug}`),
        }}
      />
      <PostViewRecorder slug={post.slug} />
      <StackNavTitle title={post.title} />

      <article className="glia-post__article">
        <header className="glia-post__header">
          <div className="glia-post__tags">
            <p className="glia-post__eyebrow">
              <span className="glia-post__eyebrow-dot" aria-hidden="true" />
              Community
            </p>

            {post.parentPost && (
              <Link href={`/community/${post.parentPost.slug}`} className="glia-post__parent">
                <ParentIcon />
                <span className="glia-post__parent-title">{post.parentPost.title}</span>
              </Link>
            )}
          </div>

          <h1 className="glia-post__title">
            {post.title}
            {post.editedAt && <span className="glia-post__edited">수정됨</span>}
          </h1>

          <div className="glia-post__byline">
            <CommunityAuthorRow
              user={post.user}
              publishedAt={publishedAt}
              headline={post.user.profile?.headline}
            />

            {isOwner ? (
              <CommunityPostOwnerMenu
                slug={post.slug}
                title={post.title}
                parentSlug={post.parentPost?.slug}
              />
            ) : (
              <CommunityReportButton targetType="POST" postSlug={post.slug} isLoggedIn={!!user} />
            )}
          </div>
        </header>

        <div className="glia-post__body">
          <PostMarkdown content={post.bodyMarkdown} />
        </div>

        <footer className="glia-post__reactions">
          <CommunityPostActions
            postSlug={post.slug}
            likeCount={post.likeCount}
            commentCount={post.commentCount}
            viewCount={post.viewCount}
            liked={post.likedByViewer}
            isLoggedIn={!!user}
            interactive
          />
        </footer>
      </article>

      {!post.parentPost && (
        <PostChildList parentSlug={post.slug} childPosts={post.childPosts} isLoggedIn={!!user} />
      )}

      <section
        id="post-comments"
        aria-labelledby="post-comments-heading"
        className="glia-post__section"
      >
        <div className="glia-post__section-head">
          <h2 id="post-comments-heading" className="glia-post__section-title">
            댓글
            {post.commentCount > 0 && (
              <span className="glia-post__section-count">
                {post.commentCount.toLocaleString("ko-KR")}
              </span>
            )}
          </h2>
        </div>

        {user ? (
          <PostCommentComposer
            postSlug={post.slug}
            formId="post-comment-form"
            variant="inline"
            user={{
              name: user.name,
              email: user.email,
              profile: { avatarUrl: user.avatarUrl },
            }}
          />
        ) : (
          <div className="community-comment-inline community-comment-inline--guest">
            <p>
              <Link
                href={`/login?next=/community/${post.slug}`}
                className="community-comment-inline__guest-link"
              >
                로그인
              </Link>{" "}
              하신 후 회복 경험을 함께 나눠 보세요.
            </p>
          </div>
        )}

        {post.comments.length === 0 ? (
          <p className="glia-post__empty">아직 작성된 댓글이 없어요. 첫 이야기를 남겨 보세요.</p>
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

function ParentIcon() {
  return (
    <svg
      aria-hidden="true"
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 6 6v5" />
    </svg>
  );
}
