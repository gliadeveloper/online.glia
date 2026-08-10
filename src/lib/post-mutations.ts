import type { Prisma } from "@/generated/prisma/client";

import { excerptFromMarkdown } from "@/lib/post-content";
import { prisma } from "@/lib/prisma";
import {
  buildPostSlug,
  validateCommentBody,
  validateMarkdownBody,
  validatePostTitle,
} from "@/lib/post-write";

type TransactionClient = Prisma.TransactionClient;

export async function createPublishedPost(params: {
  userId: string;
  title: string;
  bodyMarkdown: string;
  parentPostSlug?: string | null;
}) {
  const title = validatePostTitle(params.title);
  const bodyMarkdown = validateMarkdownBody(params.bodyMarkdown, { field: "post" });
  const now = new Date();

  let parentPostId: string | null = null;
  let rootPostId: string | null = null;

  if (params.parentPostSlug) {
    const parent = await prisma.post.findFirst({
      where: { slug: params.parentPostSlug, status: "PUBLISHED" },
      select: { id: true, rootPostId: true, parentPostId: true },
    });

    if (!parent) {
      throw new Error("PARENT_POST_NOT_FOUND");
    }

    if (parent.parentPostId) {
      throw new Error("PARENT_NOT_ROOT");
    }

    parentPostId = parent.id;
    rootPostId = parent.id;
  }

  return prisma.$transaction(async (tx: TransactionClient) => {
    const post = await tx.post.create({
      data: {
        userId: params.userId,
        slug: buildPostSlug(title),
        title,
        bodyMarkdown,
        excerpt: excerptFromMarkdown(bodyMarkdown),
        status: "PUBLISHED",
        publishedAt: now,
        parentPostId,
        rootPostId,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        parentPostId: true,
      },
    });

    if (parentPostId) {
      await tx.post.update({
        where: { id: parentPostId },
        data: { childPostCount: { increment: 1 } },
      });
    }

    return post;
  });
}

export async function createPostComment(params: {
  userId: string;
  postSlug: string;
  body: string;
  parentCommentId?: string | null;
}) {
  const bodyMarkdown = validateCommentBody(params.body);

  const post = await prisma.post.findFirst({
    where: { slug: params.postSlug, status: "PUBLISHED" },
    select: { id: true },
  });

  if (!post) {
    return null;
  }

  let parentId: string | null = null;

  if (params.parentCommentId) {
    const parent = await prisma.postComment.findFirst({
      where: {
        id: params.parentCommentId,
        postId: post.id,
        status: "PUBLISHED",
        parentId: null,
      },
      select: { id: true },
    });

    if (!parent) {
      throw new Error("PARENT_COMMENT_NOT_FOUND");
    }

    parentId = parent.id;
  }

  return prisma.$transaction(async (tx: TransactionClient) => {
    const comment = await tx.postComment.create({
      data: {
        postId: post.id,
        userId: params.userId,
        parentId,
        bodyMarkdown,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        createdAt: true,
        parentId: true,
      },
    });

    await tx.post.update({
      where: { id: post.id },
      data: { commentCount: { increment: 1 } },
    });

    return comment;
  });
}

function assertResourceOwner(resourceUserId: string, actorUserId: string) {
  if (resourceUserId !== actorUserId) {
    throw new Error("FORBIDDEN");
  }
}

export async function updatePublishedPost(params: {
  userId: string;
  postSlug: string;
  title: string;
  bodyMarkdown: string;
}) {
  const title = validatePostTitle(params.title);
  const bodyMarkdown = validateMarkdownBody(params.bodyMarkdown, { field: "post" });

  const post = await prisma.post.findFirst({
    where: { slug: params.postSlug, status: "PUBLISHED" },
    select: { id: true, userId: true },
  });

  if (!post) {
    throw new Error("POST_NOT_FOUND");
  }

  assertResourceOwner(post.userId, params.userId);

  return prisma.post.update({
    where: { id: post.id },
    data: {
      title,
      bodyMarkdown,
      excerpt: excerptFromMarkdown(bodyMarkdown),
      editedAt: new Date(),
    },
    select: { slug: true, title: true },
  });
}

export async function deletePublishedPost(params: { userId: string; postSlug: string }) {
  const post = await prisma.post.findFirst({
    where: { slug: params.postSlug, status: "PUBLISHED" },
    select: { id: true, userId: true, parentPostId: true, slug: true },
  });

  if (!post) {
    throw new Error("POST_NOT_FOUND");
  }

  assertResourceOwner(post.userId, params.userId);

  await prisma.$transaction(async (tx: TransactionClient) => {
    await tx.post.update({
      where: { id: post.id },
      data: { status: "DELETED" },
    });

    if (post.parentPostId) {
      await tx.post.update({
        where: { id: post.parentPostId },
        data: { childPostCount: { decrement: 1 } },
      });
    }
  });

  return { slug: post.slug, parentPostId: post.parentPostId };
}

export async function updatePostComment(params: {
  userId: string;
  postSlug: string;
  commentId: string;
  body: string;
}) {
  const bodyMarkdown = validateCommentBody(params.body);

  const comment = await prisma.postComment.findFirst({
    where: {
      id: params.commentId,
      status: "PUBLISHED",
      post: { slug: params.postSlug, status: "PUBLISHED" },
    },
    select: { id: true, userId: true },
  });

  if (!comment) {
    throw new Error("COMMENT_NOT_FOUND");
  }

  assertResourceOwner(comment.userId, params.userId);

  return prisma.postComment.update({
    where: { id: comment.id },
    data: {
      bodyMarkdown,
      editedAt: new Date(),
    },
    select: { id: true, editedAt: true },
  });
}

export async function deletePostComment(params: {
  userId: string;
  postSlug: string;
  commentId: string;
}) {
  const comment = await prisma.postComment.findFirst({
    where: {
      id: params.commentId,
      status: "PUBLISHED",
      post: { slug: params.postSlug, status: "PUBLISHED" },
    },
    select: {
      id: true,
      userId: true,
      postId: true,
      _count: {
        select: {
          children: { where: { status: "PUBLISHED" } },
        },
      },
    },
  });

  if (!comment) {
    throw new Error("COMMENT_NOT_FOUND");
  }

  assertResourceOwner(comment.userId, params.userId);

  const decrementBy = 1 + comment._count.children;

  await prisma.$transaction(async (tx: TransactionClient) => {
    await tx.postComment.update({
      where: { id: comment.id },
      data: { status: "DELETED" },
    });

    if (comment._count.children > 0) {
      await tx.postComment.updateMany({
        where: { parentId: comment.id, status: "PUBLISHED" },
        data: { status: "DELETED" },
      });
    }

    await tx.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: decrementBy } },
    });
  });

  return { id: comment.id };
}
