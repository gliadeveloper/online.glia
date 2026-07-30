import Link from "next/link";

import { AppButtonLink } from "@/components/app";
import { Typography } from "@/components/typography/typography";
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
    <section className="app-panel app-empty">
      <Typography as="p" role="caption" weight="medium" color="secondary" className="uppercase tracking-wide">
        수강 기간 만료
      </Typography>
      <Typography as="h1" role="pageTitle" weight="semibold" color="primary">
        {courseTitle}
      </Typography>
      <Typography as="p" role="bodySecondary" color="secondary" className="max-w-md">
        {untilLabel
          ? `${untilLabel}까지 수강 가능했던 강의입니다. 기간 연장 또는 평생 수강 복구 후 다시 학습할 수 있습니다.`
          : "수강 권한이 만료되었습니다. 상품 구매 후 다시 학습할 수 있습니다."}
      </Typography>
      <Typography as="p" role="bodySecondary" weight="medium" color="primary">
        {formatEnrollmentAccessSummary(enrollment)}
      </Typography>
      <div className="flex flex-wrap justify-center gap-3">
        <AppButtonLink href={extendHref}>90일 수강 연장</AppButtonLink>
        {restoreHref && restoreHref !== extendHref && (
          <AppButtonLink href={restoreHref} variant="secondary">
            평생 수강 복구 (번들)
          </AppButtonLink>
        )}
        <Link href="/learning" className="shell-focus-ring self-center">
          <Typography as="span" role="bodySecondary" weight="medium" color="action">
            내 학습으로
          </Typography>
        </Link>
      </div>
    </section>
  );
}
