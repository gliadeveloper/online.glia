import { prisma } from "@/lib/prisma";

export async function togglePostLike(params: { postSlug: string; userId: string }) {
  const post = await prisma.post.findFirst({
    where: { slug: params.postSlug, status: "PUBLISHED" },
    select: { id: true, likeCount: true },
  });

  if (!post) {
    return null;
  }

  const existing = await prisma.postLike.findUnique({
    where: {
      userId_postId: {
        userId: params.userId,
        postId: post.id,
      },
    },
  });

  if (existing) {
    const [, updated] = await prisma.$transaction([
      prisma.postLike.delete({ where: { id: existing.id } }),
      prisma.post.update({
        where: { id: post.id },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      }),
    ]);

    return { liked: false, likeCount: updated.likeCount };
  }

  const [, updated] = await prisma.$transaction([
    prisma.postLike.create({
      data: {
        userId: params.userId,
        postId: post.id,
      },
    }),
    prisma.post.update({
      where: { id: post.id },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true },
    }),
  ]);

  return { liked: true, likeCount: updated.likeCount };
}

export async function togglePostCommentLike(params: {
  postSlug: string;
  commentId: string;
  userId: string;
}) {
  const comment = await prisma.postComment.findFirst({
    where: {
      id: params.commentId,
      status: "PUBLISHED",
      post: { slug: params.postSlug, status: "PUBLISHED" },
    },
    select: { id: true, likeCount: true },
  });

  if (!comment) {
    return null;
  }

  const existing = await prisma.postCommentLike.findUnique({
    where: {
      userId_commentId: {
        userId: params.userId,
        commentId: comment.id,
      },
    },
  });

  if (existing) {
    const [, updated] = await prisma.$transaction([
      prisma.postCommentLike.delete({ where: { id: existing.id } }),
      prisma.postComment.update({
        where: { id: comment.id },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      }),
    ]);

    return { liked: false, likeCount: updated.likeCount };
  }

  const [, updated] = await prisma.$transaction([
    prisma.postCommentLike.create({
      data: {
        userId: params.userId,
        commentId: comment.id,
      },
    }),
    prisma.postComment.update({
      where: { id: comment.id },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true },
    }),
  ]);

  return { liked: true, likeCount: updated.likeCount };
}
