"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ReportActionsProps = {
  reportId: string;
};

export function ReportActions({ reportId }: ReportActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAction(action: "dismiss" | "hide" | "delete") {
    const label = action === "dismiss" ? "기각" : action === "hide" ? "숨김" : "삭제";
    const confirmed = window.confirm(`이 신고를 ${label} 처리할까요?`);
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/admin/community/reports/${reportId}`, {
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
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => handleAction("dismiss")}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          기각
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => handleAction("hide")}
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          숨김
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => handleAction("delete")}
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50"
        >
          삭제
        </button>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
