import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

type TransactionClient = Prisma.TransactionClient;

const VIEW_DEDUP_MS = 24 * 60 * 60 * 1000;

export async function recordPostViewIfNew(postId: string, viewerKey: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - VIEW_DEDUP_MS);

  const existing = await prisma.postView.findUnique({
    where: {
      postId_viewerKey: { postId, viewerKey },
    },
    select: { viewedAt: true },
  });

  if (existing && existing.viewedAt > cutoff) {
    return false;
  }

  await prisma.$transaction(async (tx: TransactionClient) => {
    await tx.postView.upsert({
      where: {
        postId_viewerKey: { postId, viewerKey },
      },
      create: { postId, viewerKey },
      update: { viewedAt: new Date() },
    });

    await tx.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });
  });

  return true;
}
