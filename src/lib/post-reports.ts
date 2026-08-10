import type { PostReportReason, PostReportTargetType } from "@/generated/prisma/client";

import {
  postReportReasonLabels,
  postReportReasonValues,
  postReportStatusLabels,
} from "@/lib/post-report-labels";
import { prisma } from "@/lib/prisma";

export { postReportReasonLabels, postReportStatusLabels };

export function parsePostReportReason(value: unknown): PostReportReason {
  if (typeof value !== "string" || !postReportReasonValues.includes(value as PostReportReason)) {
    throw new Error("INVALID_REPORT_REASON");
  }

  return value as PostReportReason;
}

export function validateReportDetail(detail: unknown): string | null {
  if (detail == null || detail === "") {
    return null;
  }

  if (typeof detail !== "string") {
    throw new Error("INVALID_REPORT_DETAIL");
  }

  const trimmed = detail.trim();
  if (trimmed.length > 500) {
    throw new Error("REPORT_DETAIL_TOO_LONG");
  }

  return trimmed || null;
}

async function resolveReportTarget(params: {
  targetType: PostReportTargetType;
  postSlug: string;
  commentId?: string;
}) {
  if (params.targetType === "POST") {
    const post = await prisma.post.findFirst({
      where: { slug: params.postSlug, status: "PUBLISHED" },
      select: { id: true },
    });

    if (!post) {
      throw new Error("POST_NOT_FOUND");
    }

    return post.id;
  }

  if (!params.commentId) {
    throw new Error("COMMENT_NOT_FOUND");
  }

  const comment = await prisma.postComment.findFirst({
    where: {
      id: params.commentId,
      status: "PUBLISHED",
      post: { slug: params.postSlug, status: "PUBLISHED" },
    },
    select: { id: true },
  });

  if (!comment) {
    throw new Error("COMMENT_NOT_FOUND");
  }

  return comment.id;
}

export async function createPostReport(params: {
  reporterId: string;
  targetType: PostReportTargetType;
  postSlug: string;
  commentId?: string;
  reason: PostReportReason;
  detail?: string | null;
}) {
  const targetId = await resolveReportTarget(params);

  const existing = await prisma.postReport.findUnique({
    where: {
      reporterId_targetType_targetId: {
        reporterId: params.reporterId,
        targetType: params.targetType,
        targetId,
      },
    },
    select: { id: true, status: true },
  });

  if (existing) {
    throw new Error("REPORT_ALREADY_EXISTS");
  }

  return prisma.postReport.create({
    data: {
      reporterId: params.reporterId,
      targetType: params.targetType,
      targetId,
      reason: params.reason,
      detail: params.detail ?? null,
    },
    select: { id: true, createdAt: true },
  });
}

