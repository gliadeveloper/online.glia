"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OrderApplicationActionsProps = {
  orderId: string;
  status: string;
  apiBase: "/api/coach/orders" | "/api/admin/orders";
};

export function OrderApplicationActions({ orderId, status, apiBase }: OrderApplicationActionsProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== "PENDING") {
    return null;
  }

  async function handleAction(action: "approve" | "reject") {
    setLoading(action);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/${orderId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "reject" ? { reason: reason || undefined } : {}),
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
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 space-y-3">
      <h2 className="font-semibold text-indigo-950">신청 승인</h2>
      <p className="text-sm text-indigo-900">
        승인 시 수강권·코칭권이 자동으로 부여됩니다. 거절 시 신청이 취소됩니다.
      </p>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="거절 사유 (선택)"
        className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm"
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleAction("approve")}
          disabled={loading !== null}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading === "approve" ? "승인 중…" : "승인하기"}
        </button>
        <button
          type="button"
          onClick={() => handleAction("reject")}
          disabled={loading !== null}
          className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 disabled:opacity-60"
        >
          {loading === "reject" ? "처리 중…" : "거절하기"}
        </button>
      </div>
    </div>
  );
}
