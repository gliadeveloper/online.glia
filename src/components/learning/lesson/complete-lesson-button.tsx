"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { TrustAlert, TrustButton } from "@/components/corporate-trust/app-trust-ui";

type CompleteLessonButtonProps = {
  lessonId: string;
  courseSlug: string;
  label?: string;
  compact?: boolean;
};

export function CompleteLessonButton({
  lessonId,
  courseSlug,
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
    <div className={compact ? "lesson-player-complete-wrap" : "space-y-2"}>
      <TrustButton
        type="button"
        variant="primary"
        onClick={handleComplete}
        disabled={busy || done}
        className={
          compact
            ? [
                "lesson-player-complete-btn",
                done ? "lesson-player-complete-btn--done" : "",
              ]
                .filter(Boolean)
                .join(" ")
            : undefined
        }
      >
        {done ? "완료됨" : busy ? "저장 중..." : label}
      </TrustButton>
      {error && !compact ? <TrustAlert tone="error">{error}</TrustAlert> : null}
      {error && compact ? (
        <p className="lesson-player-complete-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
