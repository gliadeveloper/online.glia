"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { OrderApplicationActions } from "@/components/orders/order-application-actions";

type OrderActionsProps = {
  orderId: string;
  status: string;
  total: number;
};

export function OrderActions({ orderId, status, total }: OrderActionsProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRefund = status === "PAID" || status === "PARTIALLY_REFUNDED";

  async function handleRefund() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total, reason: reason || "Admin refund" }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "환불 처리에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <OrderApplicationActions
        orderId={orderId}
        status={status}
        apiBase="/api/admin/orders"
      />

      {canRefund ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 space-y-3">
          <h2 className="font-semibold text-red-900">환불 처리</h2>
          <p className="text-sm text-red-800">
            전액 환불 시 수강권·코칭권이 회수되고 예약된 세션이 취소됩니다.
          </p>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="환불 사유"
            className="w-full rounded-xl border border-red-200 bg-white px-4 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="button"
            onClick={handleRefund}
            disabled={loading}
            className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "처리 중..." : `전액 환불 (${total.toLocaleString()}원)`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
