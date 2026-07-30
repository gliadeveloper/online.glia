import Link from "next/link";

import { AppPanel } from "@/components/app";
import { Typography } from "@/components/typography/typography";
import type { listPendingShareGrantsForUser } from "@/lib/checkin-share/grants";

type PendingGrant = Awaited<ReturnType<typeof listPendingShareGrantsForUser>>[number];

type CheckInSharePendingBannerProps = {
  grants: PendingGrant[];
};

export function CheckInSharePendingBanner({ grants }: CheckInSharePendingBannerProps) {
  if (grants.length === 0) {
    return null;
  }

  const primary = grants[0];

  return (
    <AppPanel className="check-in-share-banner">
      <Typography as="p" role="bodyCompact" weight="semibold" color="primary">
        코치 공유 요청 {grants.length}건
      </Typography>
      <Typography as="p" role="bodySecondary" color="secondary">
        {primary.coachName}님이 {primary.sessionNo}회차({primary.sessionTitle}) 피드백을 위해 체크인
        공유를 요청했습니다.
      </Typography>
      <Link href={`/checkin/share/${primary.id}`} className="check-in-share-banner__link shell-focus-ring">
        <Typography as="span" role="bodySecondary" weight="medium" color="action">
          미리보기 및 응답
        </Typography>
      </Link>
    </AppPanel>
  );
}
