"use client";

import { useState } from "react";

import { LessonCurriculumSidebar } from "@/components/learning/lesson/lesson-curriculum-sidebar";
import type { EnrolledCourseDetail } from "@/lib/learning-course-detail";
import type { ProgressStatus } from "@/generated/prisma/client";

type LessonPlayerTab = "curriculum" | "materials";

type LessonPlayerShellProps = {
  slug: string;
  lessonId: string;
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  modules: EnrolledCourseDetail["course"]["modules"];
  progressMap: Map<string, ProgressStatus>;
  player?: React.ReactNode;
  materials: React.ReactNode;
  actions?: React.ReactNode;
  body?: React.ReactNode;
  mobileNav?: React.ReactNode;
};

export function LessonPlayerShell({
  slug,
  lessonId,
  courseTitle,
  moduleTitle,
  lessonTitle,
  modules,
  progressMap,
  player,
  materials,
  actions,
  body,
  mobileNav,
}: LessonPlayerShellProps) {
  const [mobileTab, setMobileTab] = useState<LessonPlayerTab>("curriculum");
  const [sidebarTab, setSidebarTab] = useState<LessonPlayerTab>("curriculum");

  return (
    <div className="lesson-player">
      <div className="lesson-player__container">
        <div className="lesson-player__layout">
          <div className="lesson-player__main">
            {player ? <div className="lesson-player__video">{player}</div> : null}

          <div className="lesson-player__meta">
            <p className="lesson-player__eyebrow">
              {courseTitle} · {moduleTitle}
            </p>
            <div className="lesson-player__title-row">
              <h1 className="lesson-player__title">{lessonTitle}</h1>
              {actions ? <div className="lesson-player__actions">{actions}</div> : null}
            </div>
          </div>

          {body ? <div className="lesson-player__body">{body}</div> : null}

          {mobileNav ? <div className="lesson-player__mobile-nav lg:hidden">{mobileNav}</div> : null}

          <div className="lesson-player__mobile-tabs lg:hidden">
            <div className="lesson-player-tabs" role="tablist" aria-label="레슨 정보">
              <button
                type="button"
                role="tab"
                aria-selected={mobileTab === "curriculum"}
                className={[
                  "lesson-player-tabs__btn",
                  mobileTab === "curriculum" ? "lesson-player-tabs__btn--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setMobileTab("curriculum")}
              >
                커리큘럼
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileTab === "materials"}
                className={[
                  "lesson-player-tabs__btn",
                  mobileTab === "materials" ? "lesson-player-tabs__btn--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setMobileTab("materials")}
              >
                수업자료
              </button>
            </div>

            <div className="lesson-player__mobile-panel" role="tabpanel">
              {mobileTab === "curriculum" ? (
                <LessonCurriculumSidebar
                  slug={slug}
                  activeLessonId={lessonId}
                  modules={modules}
                  progressMap={progressMap}
                  compact
                />
              ) : (
                <div className="lesson-player-materials">{materials}</div>
              )}
            </div>
          </div>
        </div>

        <aside className="lesson-player__sidebar hidden lg:block" aria-label="커리큘럼">
          <div className="lesson-player-sidebar">
            <div className="lesson-player-sidebar__tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={sidebarTab === "curriculum"}
                className={[
                  "lesson-player-sidebar__tab",
                  sidebarTab === "curriculum"
                    ? "lesson-player-sidebar__tab--active"
                    : "lesson-player-sidebar__tab--muted",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSidebarTab("curriculum")}
              >
                커리큘럼
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sidebarTab === "materials"}
                className={[
                  "lesson-player-sidebar__tab",
                  sidebarTab === "materials"
                    ? "lesson-player-sidebar__tab--active"
                    : "lesson-player-sidebar__tab--muted",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSidebarTab("materials")}
              >
                수업자료
              </button>
            </div>
            <div className="lesson-player-sidebar__body">
              {sidebarTab === "curriculum" ? (
                <LessonCurriculumSidebar
                  slug={slug}
                  activeLessonId={lessonId}
                  modules={modules}
                  progressMap={progressMap}
                />
              ) : (
                <div className="lesson-player-materials lesson-player-materials--sidebar">{materials}</div>
              )}
            </div>
          </div>
        </aside>
        </div>
      </div>
    </div>
  );
}
