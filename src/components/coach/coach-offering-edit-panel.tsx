"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SessionTemplate = {
  id: string;
  sessionNo: number;
  title: string;
  summary: string | null;
  scheduledOffsetDays: number;
};

type CoachOfferingEditPanelProps = {
  offeringId: string;
  title: string;
  description: string | null;
  totalSessions: number;
  validDays: number;
  isActive: boolean;
  courseId: string | null;
  sessionTemplates: SessionTemplate[];
  courses: Array<{ id: string; label: string }>;
};

export function CoachOfferingEditPanel(props: CoachOfferingEditPanelProps) {
  const router = useRouter();
  const [title, setTitle] = useState(props.title);
  const [description, setDescription] = useState(props.description ?? "");
  const [totalSessions, setTotalSessions] = useState(String(props.totalSessions));
  const [validDays, setValidDays] = useState(String(props.validDays));
  const [courseId, setCourseId] = useState(props.courseId ?? "");
  const [sessionTitles, setSessionTitles] = useState(
    props.sessionTemplates.map((template) => template.title),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);

  function syncSessionTitleCount(nextTotal: number) {
    setSessionTitles((current) => {
      if (current.length === nextTotal) return current;
      if (current.length < nextTotal) {
        return [
          ...current,
          ...Array.from({ length: nextTotal - current.length }, (_, index) => {
            const sessionNo = current.length + index + 1;
            return `${sessionNo}회차`;
          }),
        ];
      }
      return current.slice(0, nextTotal);
    });
  }

  async function saveMeta(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const nextTotal = Number(totalSessions);

    try {
      const response = await fetch(`/api/coach/offerings/${props.offeringId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          totalSessions: nextTotal,
          validDays: Number(validDays),
          courseId: courseId || null,
          sessionTitles,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    setToggleBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/coach/offerings/${props.offeringId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: props.isActive ? "deactivate" : "activate" }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "처리에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setToggleBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            props.isActive ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {props.isActive ? "활성" : "비활성"}
        </span>
        <button
          type="button"
          onClick={toggleActive}
          disabled={toggleBusy}
          className={`rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60 ${
            props.isActive
              ? "border border-amber-200 bg-amber-50 text-amber-800"
              : "bg-emerald-600 text-white"
          }`}
        >
          {toggleBusy ? "처리 중…" : props.isActive ? "비활성화" : "활성화"}
        </button>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={saveMeta} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <label className="block space-y-2 text-sm">
          <span className="font-medium">제목</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-4 py-3"
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">설명</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-zinc-200 px-4 py-3"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2 text-sm">
            <span className="font-medium">회차 수</span>
            <input
              type="number"
              min={1}
              value={totalSessions}
              onChange={(event) => {
                setTotalSessions(event.target.value);
                syncSessionTitleCount(Number(event.target.value));
              }}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3"
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">유효기간 (일)</span>
            <input
              type="number"
              min={1}
              value={validDays}
              onChange={(event) => setValidDays(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3"
            />
          </label>
        </div>

        {props.courses.length > 0 && (
          <label className="block space-y-2 text-sm">
            <span className="font-medium">연결 코스</span>
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3"
            >
              <option value="">없음</option>
              {props.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium">회차 제목</p>
          {sessionTitles.map((sessionTitle, index) => (
            <label key={index} className="block space-y-1 text-sm">
              <span className="text-zinc-500">{index + 1}회차</span>
              <input
                value={sessionTitle}
                onChange={(event) => {
                  const next = [...sessionTitles];
                  next[index] = event.target.value;
                  setSessionTitles(next);
                }}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5"
              />
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "저장 중…" : "저장"}
        </button>
      </form>
    </div>
  );
}
