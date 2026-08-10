"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { EnrolledCourseDetail } from "@/lib/learning-course-detail";
import { lessonTypeLabels } from "@/lib/lesson-labels";
import type { ProgressStatus } from "@/generated/prisma/client";

type LessonCurriculumSidebarProps = {
  slug: string;
  activeLessonId: string;
  modules: EnrolledCourseDetail["course"]["modules"];
  progressMap: Map<string, ProgressStatus>;
  compact?: boolean;
};

function formatDuration(minutes: number | null) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

function StatusIcon({ status, active }: { status: ProgressStatus; active: boolean }) {
  if (active) {
    return (
      <span className="lesson-curriculum-item__icon lesson-curriculum-item__icon--active" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    );
  }

  if (status === "COMPLETED") {
    return (
      <span className="lesson-curriculum-item__icon lesson-curriculum-item__icon--done" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  return (
    <span className="lesson-curriculum-item__icon lesson-curriculum-item__icon--idle" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
      </svg>
    </span>
  );
}

export function LessonCurriculumSidebar({
  slug,
  activeLessonId,
  modules,
  progressMap,
  compact = false,
}: LessonCurriculumSidebarProps) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeLessonId]);

  return (
    <nav aria-label="커리큘럼" className={compact ? "lesson-curriculum lesson-curriculum--compact" : "lesson-curriculum"}>
      {modules.map((module) => (
        <section key={module.id} className="lesson-curriculum__chapter">
          <p className="lesson-curriculum__chapter-label">CHAPTER {module.order}</p>
          <h2 className="lesson-curriculum__chapter-title">{module.title}</h2>

          <ul className="lesson-curriculum__list">
            {module.lessons.map((lesson) => {
              const status = progressMap.get(lesson.id) ?? "NOT_STARTED";
              const active = lesson.id === activeLessonId;
              const duration = formatDuration(lesson.duration);
              const typeLabel = lessonTypeLabels[lesson.type] ?? lesson.type;

              return (
                <li key={lesson.id}>
                  <Link
                    ref={active ? activeRef : undefined}
                    href={`/learning/${slug}/lessons/${lesson.id}`}
                    className={[
                      "lesson-curriculum-item shell-focus-ring",
                      active ? "lesson-curriculum-item--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-current={active ? "page" : undefined}
                  >
                    <div className="lesson-curriculum-item__body">
                      <p className="lesson-curriculum-item__title">{lesson.title}</p>
                      <p className="lesson-curriculum-item__meta">
                        {[duration, typeLabel].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <StatusIcon status={status} active={active} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
