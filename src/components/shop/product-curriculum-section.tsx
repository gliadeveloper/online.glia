"use client";

import { useState } from "react";

import { lessonTypeLabels } from "@/lib/lesson-labels";
import type { CatalogProduct } from "@/lib/shop-products";

type CatalogCourse = NonNullable<CatalogProduct["items"][number]["course"]>;
type CatalogModule = CatalogCourse["modules"][number];
type CatalogLesson = CatalogModule["lessons"][number];

type ProductCurriculumSectionProps = {
  courses: CatalogCourse[];
};

function formatDuration(minutes: number | null) {
  if (!minutes) {
    return null;
  }

  if (minutes < 60) {
    return `${minutes}분`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

export function ProductCurriculumSection({ courses }: ProductCurriculumSectionProps) {
  const [openModuleId, setOpenModuleId] = useState<string | null>(
    courses[0]?.modules[0]?.id ?? null,
  );

  const totalLessons = courses.reduce(
    (sum: number, course: CatalogCourse) =>
      sum + course.modules.reduce((moduleSum: number, module: CatalogModule) => moduleSum + module.lessons.length, 0),
    0,
  );
  const totalMinutes = courses.reduce(
    (sum: number, course: CatalogCourse) =>
      sum +
      course.modules.reduce(
        (moduleSum: number, module: CatalogModule) =>
          moduleSum + module.lessons.reduce((lessonSum: number, lesson: CatalogLesson) => lessonSum + (lesson.duration ?? 0), 0),
        0,
      ),
    0,
  );

  return (
    <section id="pdp-curriculum" className="glia-pdp__section" aria-labelledby="pdp-curriculum-heading">
      <h2 id="pdp-curriculum-heading" className="glia-pdp__section-title">
        커리큘럼
      </h2>

      <p className="glia-pdp__meta">
        총 {totalLessons}강
        {totalMinutes > 0 ? ` · ${formatDuration(totalMinutes)}` : ""}
      </p>

      <div className="glia-pdp__weeks">
        {courses.map((course: CatalogCourse) => (
          <div key={course.id} className="glia-pdp__weeks-group">
            {courses.length > 1 ? <p className="glia-pdp__course-title">{course.title}</p> : null}

            {course.modules.map((module: CatalogModule, weekIndex: number) => {
              const isOpen = openModuleId === module.id;
              const moduleMinutes = module.lessons.reduce(
                (sum: number, lesson: CatalogLesson) => sum + (lesson.duration ?? 0),
                0,
              );

              return (
                <div key={module.id} className="glia-pdp__week">
                  <button
                    type="button"
                    className="glia-pdp__week-trigger"
                    aria-expanded={isOpen}
                    onClick={() => setOpenModuleId(isOpen ? null : module.id)}
                  >
                    <span className="glia-pdp__week-title">
                      <span className="glia-pdp__week-index">{weekIndex + 1}</span>
                      {module.title}
                    </span>
                    <span className="glia-pdp__week-meta">
                      {module.lessons.length}강
                      {moduleMinutes > 0 ? ` · ${formatDuration(moduleMinutes)}` : ""}
                    </span>
                  </button>

                  {isOpen ? (
                    <ul className="glia-pdp__lessons">
                      {module.lessons.map((lesson: CatalogLesson) => (
                        <li key={lesson.id} className="glia-pdp__lesson">
                          <span className="glia-pdp__lesson-title">{lesson.title}</span>
                          <span className="glia-pdp__lesson-meta">
                            {lessonTypeLabels[lesson.type] ?? lesson.type}
                            {lesson.duration ? ` · ${formatDuration(lesson.duration)}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
