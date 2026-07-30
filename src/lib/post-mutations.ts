import { excerptFromMarkdown } from "@/lib/post-content";
import { prisma } from "@/lib/prisma";
import {
  buildPostSlug,
  validateCommentBody,
  validateMarkdownBody,
  validatePostTitle,
} from "@/lib/post-write";

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
      select: { id: true, rootPostId: true },
    });

    if (!parent) {
      throw new Error("PARENT_POST_NOT_FOUND");
    }

    parentPostId = parent.id;
    rootPostId = parent.rootPostId ?? parent.id;
  }

  return prisma.$transaction(async (tx) => {
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
}) {
  const bodyMarkdown = validateCommentBody(params.body);

  const post = await prisma.post.findFirst({
    where: { slug: params.postSlug, status: "PUBLISHED" },
    select: { id: true },
  });

  if (!post) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const comment = await tx.postComment.create({
      data: {
        postId: post.id,
        userId: params.userId,
        bodyMarkdown,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    await tx.post.update({
      where: { id: post.id },
      data: { commentCount: { increment: 1 } },
    });

    return comment;
  });
}
