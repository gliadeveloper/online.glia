import { prisma } from "@/lib/prisma";
import type { PostCommentItem, PostSummary } from "@/lib/post-display";

export type { PostCommentItem, PostSummary } from "@/lib/post-display";
export { displayAuthorName } from "@/lib/post-display";

const authorSelect = {
  id: true,
  name: true,
  email: true,
  profile: { select: { headline: true } },
} as const;

const postSummarySelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  likeCount: true,
  commentCount: true,
  childPostCount: true,
  viewCount: true,
  publishedAt: true,
  createdAt: true,
  user: { select: authorSelect },
} as const;

const publishedPostWhere = {
  status: "PUBLISHED" as const,
};

/** Feed: root posts only (not child/hierarchy replies). */
export async function getPublishedPosts(limit?: number) {
  return prisma.post.findMany({
    where: {
      ...publishedPostWhere,
      parentPostId: null,
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: postSummarySelect,
  });
}

export type PostListItem = Awaited<ReturnType<typeof getPublishedPosts>>[number];

export async function getPublishedPostBySlug(slug: string, viewerUserId?: string) {
  const post = await prisma.post.findFirst({
    where: { slug, ...publishedPostWhere },
    include: {
      user: { select: authorSelect },
      parentPost: {
        select: { id: true, slug: true, title: true },
      },
      childPosts: {
        where: publishedPostWhere,
        orderBy: { createdAt: "asc" },
        select: postSummarySelect,
      },
      comments: {
        where: { status: "PUBLISHED", parentId: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          bodyMarkdown: true,
          likeCount: true,
          createdAt: true,
          editedAt: true,
          user: { select: authorSelect },
        },
      },
      ...(viewerUserId
        ? {
            likes: {
              where: { userId: viewerUserId },
              select: { id: true },
            },
          }
        : {}),
    },
  });

  if (!post) {
    return null;
  }

  const likedCommentIds = viewerUserId
    ? new Set(
        (
          await prisma.postCommentLike.findMany({
            where: {
              userId: viewerUserId,
              comment: { postId: post.id },
            },
            select: { commentId: true },
          })
        ).map((row) => row.commentId),
      )
    : new Set<string>();

  const { comments, childPosts, ...rest } = post;
  const likes = "likes" in post ? post.likes : [];

  return {
    ...rest,
    comments: comments as PostCommentItem[],
    childPosts: childPosts as PostSummary[],
    likedByViewer: likes.length > 0,
    likedCommentIds,
  };
}

export type PostDetail = NonNullable<Awaited<ReturnType<typeof getPublishedPostBySlug>>>;

export async function getPublishedPostSummaryBySlug(slug: string) {
  return prisma.post.findFirst({
    where: { slug, ...publishedPostWhere },
    select: { id: true, slug: true, title: true },
  });
}

export async function incrementPostViewCount(postId: string) {
  await prisma.post.update({
    where: { id: postId },
    data: { viewCount: { increment: 1 } },
  });
}
