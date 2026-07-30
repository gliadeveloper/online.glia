import Link from "next/link";

import { StatusPill } from "@/components/ui/status-pill";
import { Typography } from "@/components/typography/typography";
import type { CoachingSessionPublicationStatus } from "@/generated/prisma/client";
import { getSessionDisplayLabel } from "@/lib/coaching";
import { coachingPublicationLabels } from "@/lib/customer-labels";

type CoachingSessionCardProps = {
  sessionId: string;
  sessionNo: number;
  title: string;
  coachName: string;
  scheduledAt: string;
  publicationStatus: CoachingSessionPublicationStatus;
  pendingReplyCount?: number;
};

export function CoachingSessionCard({
  sessionId,
  sessionNo,
  title,
  coachName,
  scheduledAt,
  publicationStatus,
  pendingReplyCount = 0,
}: CoachingSessionCardProps) {
  const displayLabel = getSessionDisplayLabel({
    publicationStatus,
    scheduledAt: new Date(scheduledAt),
  });
  const isPublished = publicationStatus === "PUBLISHED";

  const content = (
    <article className="app-panel app-panel--padded transition hover:border-[var(--color-border-strong,var(--color-border))]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Typography as="p" role="caption" weight="medium" color="action">
            {sessionNo}회차
          </Typography>
          <Typography as="h3" role="bodyCompact" weight="semibold" color="primary" className="app-section-header__desc">
            {title}
          </Typography>
          <Typography as="p" role="bodySecondary" color="secondary">
            담당: {coachName}
          </Typography>
          <Typography as="p" role="bodySecondary" color="secondary" className="app-section-header__desc">
            {displayLabel}
          </Typography>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusPill tone="neutral" showCompleteIcon={false}>
            {coachingPublicationLabels[publicationStatus]}
          </StatusPill>
          {pendingReplyCount > 0 && (
            <StatusPill tone="pending" showCompleteIcon={false}>
              답변 대기 {pendingReplyCount}
            </StatusPill>
          )}
        </div>
      </div>
    </article>
  );

  if (isPublished) {
    return (
      <li>
        <Link href={`/coaching/sessions/${sessionId}`} className="shell-focus-ring block">
          {content}
          <span className="sr-only">{title} 코칭 세션으로 이동</span>
        </Link>
      </li>
    );
  }

  return <li>{content}</li>;
}
