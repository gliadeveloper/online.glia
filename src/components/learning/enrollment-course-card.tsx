import Link from "next/link";

import { Typography } from "@/components/typography/typography";
import {
  formatEnrollmentAccessSummary,
  formatEnrollmentAccessUntil,
} from "@/lib/enrollment-access";
import { enrollmentStatusLabels } from "@/lib/customer-labels";
import type { UserEnrollment } from "@/lib/learning-enrollments";

type EnrollmentCourseCardProps = {
  enrollment: UserEnrollment;
};

export function EnrollmentCourseCard({ enrollment }: EnrollmentCourseCardProps) {
  const totalLessons = enrollment.course.modules.reduce(
    (sum, module) => sum + module._count.lessons,
    0,
  );
  const completedLessons = enrollment.progress.filter(
    (item) => item.status === "COMPLETED",
  ).length;
  const category = enrollment.course.categories[0]?.category.name;
  const progressPercent = Math.round(enrollment.progressPercent);
  const accessSummary = formatEnrollmentAccessSummary(enrollment);
  const accessUntil = formatEnrollmentAccessUntil(enrollment);
  const isExpired = enrollment.status === "EXPIRED";

  const cardInner = (
    <>
      <div className="app-card__media">
        {enrollment.course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={enrollment.course.thumbnailUrl} alt="" />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <Typography as="p" role="bodySecondary" weight="medium" color="secondary">
              {enrollment.course.title}
            </Typography>
          </div>
        )}
      </div>

      <div className="app-card__body">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {category && (
              <Typography as="p" role="caption" weight="medium" color="action">
                {category}
              </Typography>
            )}
            <Typography as="h2" role="sectionTitle" weight="semibold" color="primary" className="app-section-header__desc">
              {enrollment.course.title}
            </Typography>
            {enrollment.course.description && (
              <Typography as="p" role="bodySecondary" color="secondary" className="line-clamp-2 app-section-header__desc">
                {enrollment.course.description}
              </Typography>
            )}
          </div>
          <span className="app-chip shrink-0">{enrollmentStatusLabels[enrollment.status]}</span>
        </div>

        <div className="app-section-header__desc flex flex-wrap items-center gap-2">
          <span className="app-chip">{accessSummary}</span>
          {accessUntil && (
            <Typography as="span" role="caption" color="secondary">
              ~ {accessUntil}까지
            </Typography>
          )}
        </div>

        <div className="app-section">
          <div className="mb-2 flex justify-between">
            <Typography as="span" role="bodySecondary" color="secondary">
              진도
            </Typography>
            <Typography as="span" role="bodySecondary" color="secondary">
              {completedLessons}/{totalLessons} · {progressPercent}%
            </Typography>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${enrollment.course.title} 학습 진도 ${progressPercent}%`}
            className="app-progress"
          >
            <div className="app-progress__bar" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>
    </>
  );

  if (isExpired) {
    return (
      <li>
        <div className="app-card opacity-90">
          {cardInner}
          <div className="app-card__footer">
            <Link href={enrollment.extendHref} className="corp-trust-link corp-trust-focus shell-focus-ring">
              90일 수강 연장
            </Link>
            {enrollment.restoreHref && enrollment.restoreHref !== enrollment.extendHref && (
              <Link href={enrollment.restoreHref} className="corp-trust-link corp-trust-focus shell-focus-ring text-[var(--auth-text-muted)]">
                평생 수강 복구
              </Link>
            )}
          </div>
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={`/learning/${enrollment.course.slug}`}
        className="app-card app-card--interactive shell-focus-ring"
      >
        {cardInner}
        <span className="sr-only">{enrollment.course.title} 강의로 이동</span>
      </Link>
    </li>
  );
}
