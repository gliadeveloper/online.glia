"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { PublishChecklist } from "@/lib/course-publish-checklist";
import { courseStatusLabels } from "@/lib/course-labels";
import type { CourseLevel, CourseStatus } from "@/generated/prisma/client";

type CoachCourseDetailPanelProps = {
  courseId: string;
  title: string;
  slug: string;
  description: string | null;
  level: CourseLevel;
  status: CourseStatus;
  checklist: PublishChecklist;
  hideHeader?: boolean;
};

export function CoachCourseDetailPanel({
  courseId,
  title: initialTitle,
  slug,
  description: initialDescription,
  level: initialLevel,
  status,
  checklist: initialChecklist,
  hideHeader = false,
}: CoachCourseDetailPanelProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [level, setLevel] = useState(initialLevel);
  const [checklist, setChecklist] = useState(initialChecklist);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setBusy(JSON.stringify(body));
    setError(null);

    try {
      const response = await fetch(`/api/coach/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as {
        error?: string;
        checklist?: PublishChecklist;
      };

      if (!response.ok) {
        if (data.checklist) setChecklist(data.checklist);
        setError(data.error ?? "요청에 실패했습니다.");
        return false;
      }

      router.refresh();
      return true;
    } catch {
      setError("네트워크 오류");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function saveMeta(event: React.FormEvent) {
    event.preventDefault();
    await patch({ title, description: description || undefined, level });
  }

  async function publish() {
    if (!confirm("코스를 발행하시겠습니까? 발행 후 수강생이 접근할 수 있습니다.")) return;
    await patch({ action: "publish" });
  }

  async function archive() {
    if (!confirm("코스를 보관 처리하시겠습니까?")) return;
    await patch({ action: "archive" });
  }

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">내 코스</p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900">{initialTitle}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              /learning/{slug} · {courseStatusLabels[status]}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {status === "DRAFT" && (
              <button
                type="button"
                onClick={publish}
                disabled={busy !== null}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                발행하기
              </button>
            )}
            {status === "PUBLISHED" && (
              <button
                type="button"
                onClick={archive}
                disabled={busy !== null}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                보관
              </button>
            )}
          </div>
        </div>
      )}

      {hideHeader && (
        <div className="flex flex-wrap justify-end gap-2">
          {status === "DRAFT" && (
            <button
              type="button"
              onClick={publish}
              disabled={busy !== null}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              발행하기
            </button>
          )}
          {status === "PUBLISHED" && (
            <button
              type="button"
              onClick={archive}
              disabled={busy !== null}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              보관
            </button>
          )}
        </div>
      )}

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-zinc-900">발행 체크리스트</h2>
        <ul className="mt-4 space-y-2">
          {checklist.items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 text-sm">
              <span
                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  item.ok ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-400"
                }`}
              >
                {item.ok ? "✓" : "·"}
              </span>
              <div>
                <p className={item.ok ? "text-zinc-700" : "text-zinc-900"}>{item.label}</p>
                {item.detail && <p className="text-xs text-amber-700">{item.detail}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={saveMeta} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-zinc-900">기본 정보</h2>
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
            rows={4}
            className="w-full rounded-xl border border-zinc-200 px-4 py-3"
          />
        </label>
        <button
          type="submit"
          disabled={busy !== null}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          저장
        </button>
      </form>
    </div>
  );
}
