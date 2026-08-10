import Link from "next/link";

import type { CoachLiveLessonItem } from "@/lib/coach-live-lessons";

type CoachLiveScheduleListProps = {
  lessons: CoachLiveLessonItem[];
};

export function CoachLiveScheduleList({ lessons }: CoachLiveScheduleListProps) {
  if (lessons.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-12 text-center text-sm text-zinc-500">
        등록된 LIVE 레슨이 없습니다. 코스 커리큘럼에서 LIVE 타입 레슨을 추가하세요.
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
          </div>
        </article>
      ))}
    </div>
  );
}
