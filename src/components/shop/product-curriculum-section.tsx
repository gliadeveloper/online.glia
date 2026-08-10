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
    <section id="pdp-curriculum" className="shop-pdp-block" aria-labelledby="pdp-curriculum-heading">
      <h2 id="pdp-curriculum-heading" className="shop-pdp-block__title">
        클래스 커리큘럼
      </h2>

      <div className="shop-pdp-curriculum-meta">
        <span>총 {totalLessons}강</span>
        {totalMinutes > 0 ? <span>· 총 {formatDuration(totalMinutes)}</span> : null}
      </div>

      <div className="shop-pdp-curriculum">
        {courses.map((course: CatalogCourse) => (
          <div key={course.id} className="shop-pdp-curriculum-course">
            {courses.length > 1 ? (
              <p className="shop-pdp-curriculum-course__title">{course.title}</p>
            ) : null}

            {course.modules.map((module: CatalogModule) => {
              const isOpen = openModuleId === module.id;
              const moduleMinutes = module.lessons.reduce(
                (sum: number, lesson: CatalogLesson) => sum + (lesson.duration ?? 0),
                0,
              );

              return (
                <div key={module.id} className="shop-pdp-curriculum-module">
                  <button
                    type="button"
                    className="shop-pdp-curriculum-module__trigger shell-focus-ring"
                    aria-expanded={isOpen}
                    onClick={() => setOpenModuleId(isOpen ? null : module.id)}
                  >
                    <span className="shop-pdp-curriculum-module__title">{module.title}</span>
                    <span className="shop-pdp-curriculum-module__meta">
                      {module.lessons.length}강
                      {moduleMinutes > 0 ? ` · ${formatDuration(moduleMinutes)}` : ""}
                    </span>
                  </button>

                  {isOpen ? (
                    <ul className="shop-pdp-curriculum-lessons">
                      {module.lessons.map((lesson: CatalogLesson) => (
                        <li key={lesson.id} className="shop-pdp-curriculum-lesson">
                          <span className="shop-pdp-curriculum-lesson__title">{lesson.title}</span>
                          <span className="shop-pdp-curriculum-lesson__meta">
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
