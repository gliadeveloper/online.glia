"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SAVED_NOTICE_MS = 4000;

type CheckInReportSavedNoticeProps = {
  showInitially: boolean;
};

export function CheckInReportSavedNotice({ showInitially }: CheckInReportSavedNoticeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(showInitially);

  useEffect(() => {
    if (!showInitially) {
      return;
    }

    router.replace(pathname, { scroll: false });

    const timer = window.setTimeout(() => setVisible(false), SAVED_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [pathname, router, showInitially]);

  if (!visible) {
    return null;
  }

  return <p className="glia-ci-alert glia-ci-alert--success">저장했어요</p>;
}
