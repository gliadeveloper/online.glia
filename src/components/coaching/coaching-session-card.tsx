import Link from "next/link";

import type { CoachingSessionPublicationStatus } from "@/generated/prisma/client";
import { getSessionDisplayLabel } from "@/lib/coaching";
import { coachingPublicationLabels } from "@/lib/customer-labels";

type CoachingSessionCardProps = {
  sessionId: string;
  sessionNo: number;
  title: string;
  scheduledAt: string;
  publicationStatus: CoachingSessionPublicationStatus;
  pendingReplyCount?: number;
};

function publicationVariant(status: CoachingSessionPublicationStatus) {
  if (status === "PUBLISHED") return "published";
  if (status === "DRAFT") return "draft";
  return "empty";
}

export function CoachingSessionCard({
  sessionId,
  sessionNo,
  title,
  scheduledAt,
  publicationStatus,
  pendingReplyCount = 0,
}: CoachingSessionCardProps) {
  const displayLabel = getSessionDisplayLabel({
    publicationStatus,
    scheduledAt: new Date(scheduledAt),
  });
  const isPublished = publicationStatus === "PUBLISHED";
  const variant = publicationVariant(publicationStatus);

  const content = (
    <>
      <span className="glia-session-card__no" aria-hidden="true">
        {sessionNo}
      </span>
      <div className="glia-session-card__copy">
        <div className="glia-session-card__heading">
          <h3 className="glia-session-card__title">{title}</h3>
          <span className={`glia-session-card__status glia-session-card__status--${variant}`}>
            {coachingPublicationLabels[publicationStatus]}
          </span>
        </div>
        <p className="glia-session-card__meta">
          {displayLabel}
          {pendingReplyCount > 0 ? ` · 답변 대기 ${pendingReplyCount}` : ""}
        </p>
      </div>
    </>
  );

  if (isPublished) {
    return (
      <li className="glia-session-card">
        <Link
          href={`/coaching/sessions/${sessionId}`}
          className="glia-session-card__frame glia-session-card__frame--interactive"
        >
          {content}
          <span className="sr-only">{title} 코칭 세션으로 이동</span>
        </Link>
      </li>
    );
  }

  return (
    <li className="glia-session-card">
      <div className="glia-session-card__frame glia-session-card__frame--closed">{content}</div>
    </li>
  );
}
