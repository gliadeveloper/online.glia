"use client";

import { useEffect, useState } from "react";

import { LessonCurriculumSidebar } from "@/components/learning/lesson/lesson-curriculum-sidebar";
import type { EnrolledCourseDetail } from "@/lib/learning-course-detail";
import type { ProgressStatus } from "@/generated/prisma/client";

type LessonPlayerTab = "curriculum" | "materials";
type LessonContentTab = "lecture" | "qna";

type LessonPlayerShellProps = {
  courseId: string;
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
  qna?: React.ReactNode;
  mobileNav?: React.ReactNode;
};

export function LessonPlayerShell({
  courseId,
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
  qna,
  mobileNav,
}: LessonPlayerShellProps) {
  const [mobileTab, setMobileTab] = useState<LessonPlayerTab>("curriculum");
  const [sidebarTab, setSidebarTab] = useState<LessonPlayerTab>("curriculum");
  const [contentTab, setContentTab] = useState<LessonContentTab>("lecture");

  useEffect(() => {
    function openQnaFromHash() {
      if (window.location.hash.startsWith("#qna-")) {
        setContentTab("qna");
      }
    }

    openQnaFromHash();
    window.addEventListener("hashchange", openQnaFromHash);
    return () => window.removeEventListener("hashchange", openQnaFromHash);
  }, []);

  return (
    <div className="lesson-player glia-lesson">
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

          {qna ? (
            <div className="lesson-player-content-tabs" role="tablist" aria-label="레슨 내용">
              <button
                type="button"
                role="tab"
                id="lesson-tab-lecture"
                aria-selected={contentTab === "lecture"}
                aria-controls="lesson-panel-lecture"
                className={[
                  "lesson-player-tabs__btn",
                  contentTab === "lecture" ? "lesson-player-tabs__btn--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setContentTab("lecture")}
              >
                강의
              </button>
              <button
                type="button"
                role="tab"
                id="lesson-tab-qna"
                aria-selected={contentTab === "qna"}
                aria-controls="lesson-panel-qna"
                className={[
                  "lesson-player-tabs__btn",
                  contentTab === "qna" ? "lesson-player-tabs__btn--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setContentTab("qna")}
              >
                Q&A
              </button>
            </div>
          ) : null}

          <div
            id="lesson-panel-lecture"
            role="tabpanel"
            aria-labelledby="lesson-tab-lecture"
            hidden={Boolean(qna) && contentTab !== "lecture"}
          >
            {body ? (
              <div className="lesson-player__body">{body}</div>
            ) : player ? (
              <p className="lesson-player__lecture-empty">이 레슨은 위 영상으로 진행합니다.</p>
            ) : null}
          </div>

          {qna ? (
            <div
              id="lesson-panel-qna"
              role="tabpanel"
              aria-labelledby="lesson-tab-qna"
              hidden={contentTab !== "qna"}
            >
              <div className="lesson-player__qna">{qna}</div>
            </div>
          ) : null}

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
                  courseId={courseId}
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
                  courseId={courseId}
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
