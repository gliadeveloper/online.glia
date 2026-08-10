import Link from "next/link";

import { Typography } from "@/components/typography/typography";
import type { listPendingShareGrantsForUser } from "@/lib/checkin-share/grants";

type PendingGrant = Awaited<ReturnType<typeof listPendingShareGrantsForUser>>[number];

type CheckInSharePendingBannerProps = {
  grants: PendingGrant[];
};

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 6 12 2 8 6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round" />
    </svg>
  );
}

export function CheckInSharePendingBanner({ grants }: CheckInSharePendingBannerProps) {
  if (grants.length === 0) {
    return null;
  }

  const primary = grants[0];

  return (
    <div className="check-in-share-banner" role="status">
      <div className="check-in-share-banner__head">
        <span className="check-in-share-banner__icon">
          <ShareIcon />
        </span>
        <Typography as="p" role="bodyCompact" weight="semibold" color="primary">
          코치 공유 요청 {grants.length}건
        </Typography>
      </div>
      <Typography as="p" role="bodySecondary" color="secondary">
        {primary.coachName}님이 {primary.sessionNo}회차({primary.sessionTitle}) 피드백을 위해 체크인
        공유를 요청했습니다.
      </Typography>
      <Link href={`/checkin/share/${primary.id}`} className="check-in-share-banner__link corp-trust-link corp-trust-focus">
        미리보기 및 응답
      </Link>
    </div>
  );
}
