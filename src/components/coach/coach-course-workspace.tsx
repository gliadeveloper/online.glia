"use client";

import { useState } from "react";

import { CoachCourseDetailPanel } from "@/components/coach/coach-course-detail-panel";
import { CoachCurriculumEditor } from "@/components/coach/coach-curriculum-editor";
import type { PublishChecklist } from "@/lib/course-publish-checklist";
import type { CurriculumModule } from "@/lib/coach-curriculum-utils";
import { courseStatusLabels } from "@/lib/course-labels";
import type { CourseLevel, CourseStatus } from "@/generated/prisma/client";

type CoachCourseWorkspaceProps = {
  courseId: string;
  title: string;
  description: string | null;
  level: CourseLevel;
  status: CourseStatus;
  checklist: PublishChecklist;
  modules: CurriculumModule[];
};

const tabs = [
  { id: "curriculum", label: "커리큘럼" },
  { id: "overview", label: "개요 · 발행" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function CoachCourseWorkspace(props: CoachCourseWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabId>("curriculum");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">내 코스</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">{props.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            /learning/{props.courseId} · {courseStatusLabels[props.status]}
          </p>
        </div>

        <nav aria-label="코스 작업 탭" className="flex gap-1 rounded-xl bg-zinc-100 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "curriculum" ? (
        <CoachCurriculumEditor courseId={props.courseId} modules={props.modules} />
      ) : (
        <CoachCourseDetailPanel
          courseId={props.courseId}
          title={props.title}
          description={props.description}
          level={props.level}
          status={props.status}
          checklist={props.checklist}
          hideHeader
        />
      )}
    </div>
  );
}
