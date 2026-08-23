import Link from "next/link";
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  Infinity as InfinityIcon,
} from "lucide-react";

import {
  formatEnrollmentAccessSummary,
  formatEnrollmentAccessUntil,
} from "@/lib/enrollment-access";
import { enrollmentStatusLabels } from "@/lib/customer-labels";
import { resumeLessonHref, resumeLessonId } from "@/lib/learning-course-detail";
import type { UserEnrollment } from "@/lib/learning-enrollments";

type EnrollmentCourseCardProps = {
  enrollment: UserEnrollment;
};

export function EnrollmentCourseCard({ enrollment }: EnrollmentCourseCardProps) {
  const totalLessons = enrollment.course.modules.reduce(
    (sum, module) => sum + module.lessons.length,
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
  const isCompleted = enrollment.status === "COMPLETED";
  const isLifetime = enrollment.accessDuration === "LIFETIME";
  const statusVariant = isExpired ? "expired" : isCompleted ? "completed" : "active";

  const cardInner = (
    <>
      <div className="glia-course__media">
        {enrollment.course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={enrollment.course.thumbnailUrl} alt="" />
        ) : (
          <span className="glia-course__media-fallback">
            <BookOpen size={28} aria-hidden="true" />
          </span>
        )}

        <span className={`glia-course__status glia-course__status--${statusVariant}`}>
          {isCompleted && <CheckCircle2 size={12} aria-hidden="true" />}
          {isExpired && <Clock size={12} aria-hidden="true" />}
          {enrollmentStatusLabels[enrollment.status]}
        </span>
      </div>

      <div className="glia-course__body">
        {category && <p className="glia-course__category">{category}</p>}

        <h3 className="glia-course__title">{enrollment.course.title}</h3>

        {enrollment.course.description && (
          <p className="glia-course__desc">{enrollment.course.description}</p>
        )}

        <div className="glia-course__meta">
          <span className="glia-course__chip">
            {isLifetime ? (
              <InfinityIcon size={12} aria-hidden="true" />
            ) : (
              <CalendarClock size={12} aria-hidden="true" />
            )}
            {accessSummary}
          </span>
          {accessUntil && <span className="glia-course__until">~ {accessUntil}까지</span>}
        </div>

        <div className="glia-course__progress">
          <div className="glia-course__progress-head">
            <span className="glia-course__progress-label">진도</span>
            <span className="glia-course__progress-value">
              {completedLessons}/{totalLessons} · {progressPercent}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${enrollment.course.title} 학습 진도 ${progressPercent}%`}
            className="glia-course__progress-track"
          >
            <div className="glia-course__progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>
    </>
  );

  if (isExpired) {
    return (
      <li className="glia-course">
        <div className="glia-course__frame glia-course__frame--expired">
          {cardInner}
          <div className="glia-course__footer">
            <Link
              href={enrollment.extendHref}
              className="glia-learning__btn glia-learning__btn--secondary"
            >
              90일 수강 연장
            </Link>
            {enrollment.restoreHref && enrollment.restoreHref !== enrollment.extendHref && (
              <Link
                href={enrollment.restoreHref}
                className="glia-learning__btn glia-learning__btn--ghost"
              >
                평생 수강 복구
              </Link>
            )}
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="glia-course">
      <Link
        href={resumeLessonHref(
          enrollment.course.id,
          resumeLessonId(enrollment.course.modules, enrollment.progress),
        )}
        className="glia-course__frame glia-course__frame--interactive"
      >
        {cardInner}
      </Link>
    </li>
  );
}
