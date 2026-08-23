import Link from "next/link";

import "@/components/learning/lesson-player.css";
import {
  formatEnrollmentAccessSummary,
  formatEnrollmentAccessUntil,
} from "@/lib/enrollment-access";
import type { EnrolledCourseDetail } from "@/lib/learning-course-detail";

type EnrollmentExpiredNoticeProps = {
  courseTitle: string;
  enrollment: EnrolledCourseDetail["enrollment"];
  extendHref?: string;
  restoreHref?: string;
};

export function EnrollmentExpiredNotice({
  courseTitle,
  enrollment,
  extendHref = "/shop",
  restoreHref,
}: EnrollmentExpiredNoticeProps) {
  const untilLabel = formatEnrollmentAccessUntil(enrollment);

  return (
    <section className="glia-expired">
      <p className="glia-expired__kicker">수강 기간 만료</p>
      <h1 className="glia-expired__title">{courseTitle}</h1>
      <p className="glia-expired__lede">
        {untilLabel
          ? `${untilLabel}까지 수강 가능했던 강의입니다. 기간 연장 또는 평생 수강 복구 후 다시 학습할 수 있습니다.`
          : "수강 권한이 만료되었습니다. 상품 구매 후 다시 학습할 수 있습니다."}
      </p>
      <p className="glia-expired__meta">{formatEnrollmentAccessSummary(enrollment)}</p>
      <div className="glia-expired__actions">
        <Link href={extendHref} className="glia-expired__btn glia-expired__btn--primary">
          90일 수강 연장
        </Link>
        {restoreHref && restoreHref !== extendHref ? (
          <Link href={restoreHref} className="glia-expired__btn glia-expired__btn--secondary">
            평생 수강 복구 (번들)
          </Link>
        ) : null}
        <Link href="/learning" className="glia-expired__link">
          내 학습으로
        </Link>
      </div>
    </section>
  );
}
