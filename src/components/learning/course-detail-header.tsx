import { Typography } from "@/components/typography/typography";
import {
  formatEnrollmentAccessSummary,
  formatEnrollmentAccessUntil,
} from "@/lib/enrollment-access";
import type { EnrolledCourseDetail } from "@/lib/learning-course-detail";

type CourseDetailHeaderProps = {
  course: EnrolledCourseDetail["course"];
  enrollment: EnrolledCourseDetail["enrollment"];
  completedCount: number;
  totalLessons: number;
  progressPercent: number;
};

export function CourseDetailHeader({
  course,
  enrollment,
  completedCount,
  totalLessons,
  progressPercent,
}: CourseDetailHeaderProps) {
  const accessSummary = formatEnrollmentAccessSummary(enrollment);
  const accessUntil = formatEnrollmentAccessUntil(enrollment);

  return (
    <section className="app-panel app-panel--padded">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Typography as="h1" role="pageTitle" weight="semibold" color="primary" className="sr-only lg:not-sr-only">
          {course.title}
        </Typography>
        <div className="flex flex-wrap items-center gap-2">
          <span className="app-chip">{accessSummary}</span>
          {accessUntil && (
            <Typography as="span" role="caption" color="secondary">
              ~ {accessUntil}까지
            </Typography>
          )}
        </div>
      </div>
      {course.description && (
        <Typography as="p" role="bodySecondary" color="secondary" className="app-section-header__desc max-w-3xl">
          {course.description}
        </Typography>
      )}

      {(course.categories.length > 0 || course.tags.length > 0) && (
        <ul className="app-section-header__desc flex flex-wrap gap-2" aria-label="강의 분류">
          {course.categories.map(({ category }) => (
            <li key={category.id}>
              <span className="app-chip app-chip--action">{category.name}</span>
            </li>
          ))}
          {course.tags.map(({ tag }) => (
            <li key={tag.id}>
              <span className="app-chip">#{tag.name}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="app-section">
        <div className="mb-2 flex justify-between">
          <Typography as="span" role="bodySecondary" color="secondary">
            전체 진도
          </Typography>
          <Typography as="span" role="bodySecondary" color="secondary">
            {completedCount}/{totalLessons} · {progressPercent}%
          </Typography>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${course.title} 전체 학습 진도 ${progressPercent}%`}
          className="app-progress"
        >
          <div className="app-progress__bar" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
    </section>
  );
}
