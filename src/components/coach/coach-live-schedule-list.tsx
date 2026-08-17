"use client";

import Link from "next/link";
import { useState } from "react";

import type { CoachLiveLessonItem } from "@/lib/coach-live-lessons";

type CoachLiveScheduleListProps = {
  lessons: CoachLiveLessonItem[];
};

export function CoachLiveScheduleList({ lessons }: CoachLiveScheduleListProps) {
  const [statuses, setStatuses] = useState(() => new Map(lessons.map((lesson) => [lesson.lessonId, lesson.liveStatus])));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(lessonId: string, action: "start" | "end") {
    setPendingId(lessonId);
    setError(null);
    try {
      const response = await fetch(`/api/coach/live/${lessonId}/${action}`, { method: "POST" });
      if (!response.ok) throw new Error("라이브 상태를 변경하지 못했습니다.");
      const session = await response.json() as { status: "LIVE" | "ENDED" };
      setStatuses((current) => new Map(current).set(lessonId, session.status));
    } catch (error) {
      setError(error instanceof Error ? error.message : "라이브 상태를 변경하지 못했습니다.");
    } finally {
      setPendingId(null);
    }
  }
  if (lessons.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-12 text-center text-sm text-zinc-500">
        등록된 LIVE 레슨이 없습니다. 코스 커리큘럼에서 LIVE 타입 레슨을 추가하세요.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {lessons.map((lesson) => (
        <article
          key={lesson.lessonId}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-zinc-500">{lesson.courseTitle}</p>
              <h2 className="font-semibold text-zinc-900">{lesson.lessonTitle}</h2>
            </div>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                lesson.zoomUrl ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {lesson.zoomUrl ? "Zoom 등록됨" : "Zoom 미등록"}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            {lesson.zoomUrl ? (
              <a
                href={lesson.zoomUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-emerald-700 hover:underline"
              >
                Zoom 링크 열기
              </a>
            ) : (
              <span className="text-zinc-400">Zoom URL을 등록하세요</span>
            )}
            <Link
              href={lesson.editHref}
              className="rounded-xl border border-zinc-200 px-3 py-1.5 font-medium text-zinc-800 hover:bg-zinc-50"
            >
              레슨 편집
            </Link>
            {statuses.get(lesson.lessonId) === "LIVE" ? (
              <button type="button" disabled={pendingId === lesson.lessonId} onClick={() => changeStatus(lesson.lessonId, "end")} className="rounded-xl bg-zinc-800 px-3 py-1.5 font-medium text-white disabled:opacity-50">라이브 종료</button>
            ) : (
              <button type="button" disabled={!lesson.zoomUrl || pendingId === lesson.lessonId} onClick={() => changeStatus(lesson.lessonId, "start")} className="rounded-xl bg-emerald-600 px-3 py-1.5 font-medium text-white disabled:opacity-50">라이브 시작</button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
