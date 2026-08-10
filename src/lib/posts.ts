import { getWeekPeriodKey } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

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

const commentSelect = {
  id: true,
  bodyMarkdown: true,
  likeCount: true,
  createdAt: true,
  editedAt: true,
  user: { select: authorSelect },
  children: {
    where: { status: "PUBLISHED" as const },
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      bodyMarkdown: true,
      likeCount: true,
      createdAt: true,
      editedAt: true,
      user: { select: authorSelect },
    },
  },
} as const;

const publishedPostWhere = {
  status: "PUBLISHED" as const,
};

function postEngagementScore(post: {
  likeCount: number;
  commentCount: number;
  viewCount: number;
}) {
  return post.likeCount * 2 + post.commentCount * 3 + post.viewCount;
}

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

/** Sidebar: this week's posts ranked by engagement (likes, comments, views). */
export async function getPopularPostsThisWeek(limit = 6) {
  const timezone = "Asia/Seoul";
  const weekStartKey = getWeekPeriodKey(timezone);
  const weekStart = new Date(`${weekStartKey}T00:00:00+09:00`);

  const weekPosts = await prisma.post.findMany({
    where: {
      ...publishedPostWhere,
      parentPostId: null,
      publishedAt: { gte: weekStart },
    },
    select: postSummarySelect,
    take: 40,
  });

  const ranked = weekPosts
    .slice()
    .sort((a: PostListItem, b: PostListItem) => {
      const scoreDiff = postEngagementScore(b) - postEngagementScore(a);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      const bTime = b.publishedAt?.getTime() ?? b.createdAt.getTime();
      const aTime = a.publishedAt?.getTime() ?? a.createdAt.getTime();
      return bTime - aTime;
    })
    .slice(0, limit);

  if (ranked.length >= limit) {
    return ranked;
  }

  const fallback = await prisma.post.findMany({
    where: {
      ...publishedPostWhere,
      parentPostId: null,
      id: { notIn: ranked.map((post) => post.id) },
    },
    select: postSummarySelect,
    take: 40,
  });

  return [...ranked, ...fallback
    .sort((a: PostListItem, b: PostListItem) => postEngagementScore(b) - postEngagementScore(a))
    .slice(0, limit - ranked.length)];
}

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
        select: commentSelect,
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
    comments: mapCommentTree(comments),
    childPosts: childPosts as import("@/lib/post-display").PostSummary[],
    likedByViewer: likes.length > 0,
    likedCommentIds,
  };
}

function mapCommentTree(
  comments: Array<{
    id: string;
    bodyMarkdown: string;
    likeCount: number;
    createdAt: Date;
    editedAt: Date | null;
    user: import("@/lib/post-display").PostAuthor;
    children: Array<{
      id: string;
      bodyMarkdown: string;
      likeCount: number;
      createdAt: Date;
      editedAt: Date | null;
      user: import("@/lib/post-display").PostAuthor;
    }>;
  }>,
): import("@/lib/post-display").PostCommentItem[] {
  return comments.map(({ children, ...comment }) => ({
    ...comment,
    replies: children,
  }));
}

export type PostDetail = NonNullable<Awaited<ReturnType<typeof getPublishedPostBySlug>>>;

export async function getPublishedPostSummaryBySlug(slug: string) {
  return prisma.post.findFirst({
    where: { slug, ...publishedPostWhere },
    select: { id: true, slug: true, title: true },
  });
}

/** Parent for a new child post — root posts only (no nested children). */
export async function getChildPostParentBySlug(slug: string) {
  return prisma.post.findFirst({
    where: { slug, ...publishedPostWhere, parentPostId: null },
    select: { id: true, slug: true, title: true },
  });
}

/** Edit page — author-owned published post only. */
export async function getEditablePostBySlug(slug: string, userId: string) {
  return prisma.post.findFirst({
    where: { slug, ...publishedPostWhere, userId },
    select: {
      id: true,
      slug: true,
      title: true,
      bodyMarkdown: true,
      parentPost: { select: { slug: true, title: true } },
    },
  });
}

export async function incrementPostViewCount(postId: string) {
  await prisma.post.update({
    where: { id: postId },
    data: { viewCount: { increment: 1 } },
  });
}

export type { PostCommentItem, PostSummary } from "@/lib/post-display";
export { displayAuthorName } from "@/lib/post-display";
