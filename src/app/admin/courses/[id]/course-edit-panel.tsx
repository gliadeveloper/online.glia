"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CourseLevel } from "@/generated/prisma/client";
import { courseLevelLabels } from "@/lib/course-labels";

type CourseEditPanelProps = {
  courseId: string;
  title: string;
  description: string | null;
  level: CourseLevel;
  thumbnailUrl: string | null;
  isFeatured: boolean;
};

export function CourseEditPanel({
  courseId,
  title: initialTitle,
  description: initialDescription,
  level: initialLevel,
  thumbnailUrl: initialThumbnailUrl,
  isFeatured: initialIsFeatured,
}: CourseEditPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [level, setLevel] = useState<CourseLevel>(initialLevel);
  const [thumbnailUrl, setThumbnailUrl] = useState(initialThumbnailUrl ?? "");
  const [isFeatured, setIsFeatured] = useState(initialIsFeatured);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          level,
          thumbnailUrl: thumbnailUrl || undefined,
          isFeatured,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm"
      >
        코스 편집
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">코스 편집</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-zinc-400">
                ✕
              </button>
            </div>

            {error && (
              <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-2 text-sm">
                <span className="font-medium">제목</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  required
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">설명</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">레벨</span>
                <select
                  value={level}
                  onChange={(event) => setLevel(event.target.value as CourseLevel)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                >
                  {Object.entries(courseLevelLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">썸네일 URL</span>
                <input
                  value={thumbnailUrl}
                  onChange={(event) => setThumbnailUrl(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  placeholder="https://..."
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(event) => setIsFeatured(event.target.checked)}
                />
                <span className="font-medium">Featured 코스</span>
              </label>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                저장
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
