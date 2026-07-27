"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CourseActionsProps = {
  courseId: string;
  status: string;
};

export function CourseActions({ courseId, status }: CourseActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: "publish" | "archive") {
    setLoading(action);
    setError(null);

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "처리에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status !== "PUBLISHED" && (
          <button
            type="button"
            onClick={() => runAction("publish")}
            disabled={loading !== null}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading === "publish" ? "발행 중..." : "발행"}
          </button>
        )}
        {status !== "ARCHIVED" && (
          <button
            type="button"
            onClick={() => runAction("archive")}
            disabled={loading !== null}
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 disabled:opacity-60"
          >
            {loading === "archive" ? "처리 중..." : "보관"}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
