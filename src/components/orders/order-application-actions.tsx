"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OrderApplicationActionsProps = {
  orderId: string;
  status: string;
  apiBase: "/api/coach/orders" | "/api/admin/orders";
  compact?: boolean;
};

export function OrderApplicationActions({
  orderId,
  status,
  apiBase,
  compact = false,
}: OrderApplicationActionsProps) {
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
    <div
      className={
        compact
          ? "mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4"
          : "space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-5"
      }
    >
      <div>
        <h2 className="font-semibold text-zinc-900">{compact ? "이 신청을 승인할까요?" : "신청 승인"}</h2>
        <p className="mt-1 text-sm text-zinc-600">
          승인하면 수강권·코칭권이 바로 부여됩니다. 거절하면 신청이 취소됩니다.
        </p>
      </div>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="거절 사유 (선택)"
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm"
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleAction("approve")}
          disabled={loading !== null}
          className="rounded-xl bg-(--glia-blue) px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
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
