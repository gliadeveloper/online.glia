"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CompleteLessonButtonProps = {
  lessonId: string;
  courseSlug: string;
  label?: string;
};

export function CompleteLessonButton({
  lessonId,
  courseSlug,
  label = "학습 완료",
}: CompleteLessonButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/lms/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseSlug, status: "COMPLETED" }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      setDone(true);
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleComplete}
        disabled={busy || done}
        className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm disabled:opacity-60"
      >
        {done ? "완료됨 ✓" : busy ? "저장 중..." : label}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
