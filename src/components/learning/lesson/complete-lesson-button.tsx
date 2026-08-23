"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CompleteLessonButtonProps = {
  lessonId: string;
  courseId: string;
  label?: string;
  compact?: boolean;
};

export function CompleteLessonButton({
  lessonId,
  courseId,
  label = "학습 완료",
  compact = false,
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
        body: JSON.stringify({ courseId, status: "COMPLETED" }),
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
    <div className={compact ? "lesson-player-complete-wrap" : undefined}>
      <button
        type="button"
        onClick={handleComplete}
        disabled={busy || done}
        className={
          compact
            ? ["lesson-player-complete-btn", done ? "lesson-player-complete-btn--done" : ""]
                .filter(Boolean)
                .join(" ")
            : "lesson-task__btn"
        }
      >
        {done ? "완료됨" : busy ? "저장 중..." : label}
      </button>
      {error ? (
        <p className="lesson-player-complete-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
