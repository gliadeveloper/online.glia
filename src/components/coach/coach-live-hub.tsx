"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { CoachLiveStudio } from "@/components/coach/coach-live-room";
import type { CoachLiveReplayItem, CoachLiveSessionItem } from "@/lib/coach-live";

type CoachLiveHubProps = {
  initialSessions: CoachLiveSessionItem[];
  initialReplays: CoachLiveReplayItem[];
};

function statusBadge(session: CoachLiveSessionItem) {
  switch (session.sessionStatus) {
    case "LIVE":
      return { label: "진행 중", className: "bg-red-100 text-red-700" };
    case "ENDED":
      return { label: "종료", className: "bg-zinc-200 text-zinc-700" };
    default:
      return { label: "예정", className: "bg-emerald-100 text-emerald-800" };
  }
}

function recordingBadge(status: CoachLiveSessionItem["recordingStatus"]) {
  switch (status) {
    case "recording":
      return { label: "녹화 중", className: "bg-red-50 text-red-700" };
    case "processing":
      return { label: "녹화 처리 중", className: "bg-amber-50 text-amber-800" };
    case "ready":
      return { label: "녹화 완료", className: "bg-emerald-50 text-emerald-800" };
    case "failed":
      return { label: "녹화 실패", className: "bg-red-50 text-red-800" };
    default:
      return null;
  }
}

export function CoachLiveHub({ initialSessions, initialReplays }: CoachLiveHubProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [replays, setReplays] = useState(initialReplays);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyLessonId, setBusyLessonId] = useState<string | null>(null);
  const [studioLessonId, setStudioLessonId] = useState<string | null>(null);
  const [rescheduleLessonId, setRescheduleLessonId] = useState<string | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState("");

  const grouped = useMemo(() => {
    const liveNow = sessions.filter((session) => session.sessionStatus === "LIVE");
    const upcoming = sessions.filter((session) => session.sessionStatus === "SCHEDULED");
    const ended = sessions.filter((session) => session.sessionStatus === "ENDED");
    return { liveNow, upcoming, ended };
  }, [sessions]);

  async function refreshSessions() {
    const response = await fetch("/api/coach/live");
    const data = (await response.json()) as { sessions?: CoachLiveSessionItem[]; replays?: CoachLiveReplayItem[] };
    if (response.ok) {
      if (Array.isArray(data)) {
        setSessions(data);
      } else {
        if (data.sessions) setSessions(data.sessions);
        if (data.replays) setReplays(data.replays);
      }
    }
    router.refresh();
  }

  async function patchSession(lessonId: string, body: Record<string, unknown>) {
    setBusyLessonId(lessonId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/coach/live/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
        converted?: boolean;
      };
      if (!response.ok) {
        setError(data.error ?? data.message ?? "요청에 실패했습니다.");
        return false;
      }
      if (data.message) {
        setNotice(data.message);
      }
      await refreshSessions();
      return true;
    } catch {
      setError("네트워크 오류");
      return false;
    } finally {
      setBusyLessonId(null);
    }
  }

  function toDatetimeLocal(iso: string) {
    const date = new Date(iso);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function renderSessionCard(session: CoachLiveSessionItem) {
    const badge = statusBadge(session);
    const recording = recordingBadge(session.recordingStatus);
    const isBusy = busyLessonId === session.lessonId;

    return (
      <article
        key={session.lessonId}
        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
                {badge.label}
              </span>
              {recording && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${recording.className}`}>
                  {recording.label}
                </span>
              )}
            </div>
            <h3 className="mt-2 text-lg font-semibold text-zinc-900">{session.lessonTitle}</h3>
            <p className="mt-1 text-sm text-zinc-600">
              {session.courseTitle} · {session.moduleTitle}
            </p>
            {session.scheduledLabel && (
              <p className="mt-2 text-sm font-medium text-emerald-800">{session.scheduledLabel}</p>
            )}
            {session.countdownLabel && session.sessionStatus === "SCHEDULED" && (
              <p className="mt-1 text-sm text-zinc-500">{session.countdownLabel}</p>
            )}
            {session.sessionStatus === "ENDED" && session.replayStatusLabel && (
              <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                {session.replayStatusLabel}
              </p>
            )}
          </div>
          <Link
            href={`/coach/lessons/${session.lessonId}`}
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            레슨 편집
          </Link>
        </div>

        {!session.hasRecordingConfig && session.sessionStatus !== "ENDED" && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            R2 녹화 설정이 없습니다. 라이브는 가능하지만 다시보기 자동 생성은 되지 않습니다.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {session.canReschedule && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setRescheduleLessonId(session.lessonId);
                setRescheduleValue(toDatetimeLocal(session.scheduledAt));
              }}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              일정 변경
            </button>
          )}
          {session.canStart && (
            <button
              type="button"
              disabled={isBusy}
              onClick={async () => {
                const ok = await patchSession(session.lessonId, { action: "start" });
                if (ok) setStudioLessonId(session.lessonId);
              }}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              라이브 시작
            </button>
          )}
          {session.canEnd && (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setStudioLessonId(session.lessonId)}
                className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
              >
                스튜디오 열기
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={async () => {
                  if (
                    !confirm(
                      "라이브를 종료하고 녹화본을 다시보기 동영상으로 변환하시겠습니까?",
                    )
                  ) {
                    return;
                  }
                  const ok = await patchSession(session.lessonId, { action: "end" });
                  if (ok) setStudioLessonId(null);
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                종료 · 다시보기 생성
              </button>
            </>
          )}
          {session.canConvertReplay && (
            <button
              type="button"
              disabled={isBusy}
              onClick={async () => {
                const ok = await patchSession(session.lessonId, { action: "convert-replay" });
                if (ok) setStudioLessonId(null);
              }}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              다시보기로 변환
            </button>
          )}
        </div>

        {rescheduleLessonId === session.lessonId && (
          <form
            className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-zinc-100 bg-zinc-50 p-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const ok = await patchSession(session.lessonId, {
                action: "reschedule",
                scheduledAt: new Date(rescheduleValue).toISOString(),
              });
              if (ok) setRescheduleLessonId(null);
            }}
          >
            <label className="block min-w-[220px] flex-1 space-y-1 text-sm">
              <span className="font-medium text-zinc-700">새 시작 일시</span>
              <input
                type="datetime-local"
                value={rescheduleValue}
                onChange={(event) => setRescheduleValue(event.target.value)}
                required
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => setRescheduleLessonId(null)}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600"
            >
              취소
            </button>
          </form>
        )}

        {studioLessonId === session.lessonId && session.sessionStatus === "LIVE" && (
          <div className="mt-4">
            <CoachLiveStudio
              lessonId={session.lessonId}
              tokenEndpoint={`/api/coach/live/${session.lessonId}`}
            />
          </div>
        )}
      </article>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {notice}
        </p>
      )}

      {sessions.length === 0 && replays.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
          <p className="font-medium text-zinc-800">예정된 라이브 수업이 없습니다</p>
          <p className="mt-2 text-sm text-zinc-500">
            코스 커리큘럼에서 LIVE 레슨을 추가하고 시작 일시를 등록하세요.
          </p>
          <Link
            href="/coach/courses"
            className="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            내 코스로 이동
          </Link>
        </div>
      ) : (
        <>
          {grouped.liveNow.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-red-700">
                진행 중
              </h2>
              {grouped.liveNow.map(renderSessionCard)}
            </section>
          )}

          {grouped.upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                예정
              </h2>
              {grouped.upcoming.map(renderSessionCard)}
            </section>
          )}

          {grouped.ended.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                종료됨 · 다시보기 대기
              </h2>
              <p className="text-sm text-zinc-500">
                변환이 완료되면 아래 「다시보기 완료」 섹션으로 이동합니다.
              </p>
              {grouped.ended.map(renderSessionCard)}
            </section>
          )}
        </>
      )}

      {replays.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-700">
            다시보기 완료
          </h2>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            {replays.map((replay) => (
              <li key={replay.lessonId} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-medium text-zinc-900">{replay.lessonTitle}</p>
                  <p className="mt-1 text-sm text-zinc-500">{replay.courseTitle}</p>
                </div>
                <Link
                  href={replay.previewHref}
                  className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-50"
                >
                  수강 화면에서 보기
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
