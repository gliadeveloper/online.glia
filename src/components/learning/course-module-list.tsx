import Link from "next/link";

import { ProgressStatusPill } from "@/components/learning/progress-status-pill";
import { Typography } from "@/components/typography/typography";
import type { EnrolledCourseDetail } from "@/lib/learning-course-detail";
import { lessonTypeLabels } from "@/lib/lesson-labels";
import type { ProgressStatus } from "@/generated/prisma/client";

type CourseModuleListProps = {
  courseId: string;
  modules: EnrolledCourseDetail["course"]["modules"];
  progressMap: Map<string, ProgressStatus>;
};

export function CourseModuleList({ courseId, modules, progressMap }: CourseModuleListProps) {
  return (
    <div className="app-section">
      {modules.map((module) => (
        <section
          key={module.id}
          aria-labelledby={`module-${module.id}-title`}
          className="app-module-panel"
        >
          <div className="app-module-panel__header">
            <Typography as="p" role="caption" color="secondary">
              MODULE {module.order}
            </Typography>
            <Typography as="h2" id={`module-${module.id}-title`} role="sectionTitle" weight="semibold" color="primary">
              {module.title}
            </Typography>
            {module.description && (
              <Typography as="p" role="bodySecondary" color="secondary" className="app-section-header__desc">
                {module.description}
              </Typography>
            )}
          </div>

          <ul className="app-module-panel__list">
            {module.lessons.map((lesson) => {
              const status = progressMap.get(lesson.id) ?? "NOT_STARTED";
              const meta = [
                lessonTypeLabels[lesson.type] ?? lesson.type,
                lesson.duration ? `${lesson.duration}분` : null,
                lesson.isFree ? "무료 미리보기" : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <li key={lesson.id}>
                  <Link
                    href={`/learning/${courseId}/lessons/${lesson.id}`}
                    className="app-list-row shell-focus-ring"
                  >
                    <div className="app-list-row__inner">
                      <div className="min-w-0">
                        <Typography as="p" role="bodyCompact" weight="medium" color="primary">
                          {lesson.title}
                        </Typography>
                        <Typography as="p" role="caption" color="secondary">
                          {meta}
                        </Typography>
                      </div>
                      <ProgressStatusPill status={status} />
                    </div>
                    <span className="sr-only">{lesson.title} 레슨으로 이동</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
