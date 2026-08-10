import type { PostReportTargetType, Prisma } from "@/generated/prisma/client";

import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { displayAuthorName } from "@/lib/post-display";

type TransactionClient = Prisma.TransactionClient;

const authorSelect = {
  id: true,
  name: true,
  email: true,
} as const;

type PendingReportRow = Prisma.PostReportGetPayload<{
  include: {
    reporter: { select: typeof authorSelect };
    reviewedBy: { select: typeof authorSelect };
  };
}>;

type PostTarget = {
  id: string;
  slug: string;
  title: string;
  status: string;
  user: { id: string; name: string | null; email: string };
};

type CommentTarget = {
  id: string;
  bodyMarkdown: string;
  status: string;
  user: { id: string; name: string | null; email: string };
  post: { slug: string; title: string };
};

export type PendingPostReport = PendingReportRow & {
  target: PostTarget | CommentTarget | null;
};

export async function listPendingPostReports(limit = 50): Promise<PendingPostReport[]> {
  const reports: PendingReportRow[] = await prisma.postReport.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      reporter: { select: authorSelect },
      reviewedBy: { select: authorSelect },
    },
  });

  const postIds = reports
    .filter((row: PendingReportRow) => row.targetType === "POST")
    .map((row: PendingReportRow) => row.targetId);
  const commentIds = reports
    .filter((row: PendingReportRow) => row.targetType === "COMMENT")
    .map((row: PendingReportRow) => row.targetId);

  const [posts, comments]: [PostTarget[], CommentTarget[]] = await Promise.all([
    postIds.length
      ? prisma.post.findMany({
          where: { id: { in: postIds } },
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            user: { select: authorSelect },
          },
        })
      : Promise.resolve([] as PostTarget[]),
    commentIds.length
      ? prisma.postComment.findMany({
          where: { id: { in: commentIds } },
          select: {
            id: true,
            bodyMarkdown: true,
            status: true,
            user: { select: authorSelect },
            post: { select: { slug: true, title: true } },
          },
        })
      : Promise.resolve([] as CommentTarget[]),
  ]);

  const postMap = new Map(posts.map((post: PostTarget) => [post.id, post]));
  const commentMap = new Map(comments.map((comment: CommentTarget) => [comment.id, comment]));

  return reports.map((report: PendingReportRow) => ({
    ...report,
    target:
      report.targetType === "POST"
        ? postMap.get(report.targetId) ?? null
        : commentMap.get(report.targetId) ?? null,
  }));
}

export async function resolvePostReport(params: {
  reportId: string;
  adminUserId: string;
  action: "dismiss" | "hide" | "delete";
  resolution?: string;
}) {
  const report = await prisma.postReport.findUnique({
    where: { id: params.reportId },
  });

  if (!report) {
    throw new Error("REPORT_NOT_FOUND");
  }

  if (report.status !== "PENDING") {
    throw new Error("REPORT_ALREADY_RESOLVED");
  }

  const now = new Date();

  await prisma.$transaction(async (tx: TransactionClient) => {
    if (params.action === "hide" || params.action === "delete") {
      await applyModerationAction(tx, report.targetType, report.targetId, params.action);
    }

    await tx.postReport.update({
      where: { id: report.id },
      data: {
        status: params.action === "dismiss" ? "DISMISSED" : "REVIEWED",
        reviewedAt: now,
        reviewedById: params.adminUserId,
        resolution: params.resolution ?? defaultResolution(params.action),
      },
    });
  });

  await writeAuditLog({
    actorId: params.adminUserId,
    action: `community.report.${params.action}`,
    entityType: report.targetType.toLowerCase(),
    entityId: report.targetId,
    metadata: {
      reportId: report.id,
      reason: report.reason,
    },
  });

  return { id: report.id, action: params.action };
}

function defaultResolution(action: "dismiss" | "hide" | "delete") {
  switch (action) {
    case "dismiss":
      return "신고 기각";
    case "hide":
      return "콘텐츠 숨김 처리";
    case "delete":
      return "콘텐츠 삭제 처리";
  }
}

async function applyModerationAction(
  tx: TransactionClient,
  targetType: PostReportTargetType,
  targetId: string,
  action: "hide" | "delete",
) {
  const nextStatus = action === "hide" ? "HIDDEN" : "DELETED";

  if (targetType === "POST") {
    const post = await tx.post.findUnique({
      where: { id: targetId },
      select: { id: true, status: true, parentPostId: true },
    });

    if (!post || post.status !== "PUBLISHED") {
      throw new Error("POST_NOT_FOUND");
    }

    await tx.post.update({
      where: { id: post.id },
      data: { status: nextStatus },
    });

    if (post.parentPostId) {
      await tx.post.update({
        where: { id: post.parentPostId },
        data: { childPostCount: { decrement: 1 } },
      });
    }

    return;
  }

  const comment = await tx.postComment.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      status: true,
      postId: true,
      _count: {
        select: {
          children: { where: { status: "PUBLISHED" } },
        },
      },
    },
  });

  if (!comment || comment.status !== "PUBLISHED") {
    throw new Error("COMMENT_NOT_FOUND");
  }

  const decrementBy = 1 + comment._count.children;

  await tx.postComment.update({
    where: { id: comment.id },
    data: { status: nextStatus },
  });

  if (comment._count.children > 0) {
    await tx.postComment.updateMany({
      where: { parentId: comment.id, status: "PUBLISHED" },
      data: { status: nextStatus },
    });
  }

  await tx.post.update({
    where: { id: comment.postId },
    data: { commentCount: { decrement: decrementBy } },
  });
}

export function formatReportTargetSummary(
  targetType: PostReportTargetType,
  target: PendingPostReport["target"],
) {
  if (!target) {
    return "대상을 찾을 수 없음";
  }

  if (targetType === "POST" && "title" in target) {
    return `${displayAuthorName(target.user)} · ${target.title}`;
  }

  if ("bodyMarkdown" in target) {
    const excerpt = target.bodyMarkdown.slice(0, 80);
    return `${displayAuthorName(target.user)} · ${target.post.title} — ${excerpt}`;
  }

  return "알 수 없음";
}
