"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TrustAlert } from "@/components/corporate-trust/app-trust-ui";

const SAVED_NOTICE_MS = 4000;

type CheckInReportSavedNoticeProps = {
  showInitially: boolean;
};

/** Shown once after form submit (?saved=1). Strips the query param and auto-dismisses. */
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

  return (
    <div className="check-in-report__saved-notice">
      <TrustAlert tone="success">저장했어요</TrustAlert>
    </div>
  );
}
