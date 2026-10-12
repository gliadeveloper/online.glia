"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { OrderApplicationActions } from "@/components/orders/order-application-actions";

type OrderActionsProps = {
  orderId: string;
  status: string;
  checkout: string;
  total: number;
  tossCancel: { balance: number; environment: "TEST" | "LIVE" } | null;
  apiBase: "/api/admin/orders" | "/api/coach/orders";
};

export function OrderActions({ orderId, status, checkout, total, tossCancel, apiBase }: OrderActionsProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(tossCancel ? String(tossCancel.balance) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRefund = !tossCancel && (status === "PAID" || status === "PARTIALLY_REFUNDED");

  async function handleRefund(refundAmount: number, refundReason: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: refundAmount, reason: refundReason }),
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
        checkout={checkout}
        apiBase={apiBase}
      />

      {tossCancel ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 space-y-3">
          <h2 className="font-semibold text-red-900">
            {tossCancel.environment === "TEST" ? "테스트 결제 취소" : "결제 취소"}
          </h2>
          <p className="text-sm text-red-800">
            {tossCancel.environment === "TEST"
              ? "테스트 결제는 출금이 없습니다. 전액을 취소해도 수강권은 생기지 않습니다."
              : "카드 결제는 매입 전에 바로 환불됩니다. 매입 이후이거나 일부 금액만 취소하면 영업일 기준 3–4일이 걸립니다. 결제 후 1년이 지나면 카드사에 따라 취소되지 않을 수 있습니다. 전액 취소 시 수강권·코칭권이 회수됩니다."}
          </p>
          {tossCancel.environment === "LIVE" ? (
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="numeric"
              placeholder="취소 금액"
              className="w-full rounded-xl border border-red-200 bg-white px-4 py-2 text-sm"
            />
          ) : null}
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="취소 사유"
            maxLength={200}
            className="w-full rounded-xl border border-red-200 bg-white px-4 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="button"
            onClick={() => {
              const cancelAmount = tossCancel.environment === "TEST" ? tossCancel.balance : Number(amount);
              if (!Number.isSafeInteger(cancelAmount) || cancelAmount < 1 || cancelAmount > tossCancel.balance) {
                setError("취소 금액이 남은 금액보다 큽니다.");
                return;
              }
              void handleRefund(cancelAmount, reason || "구매자가 취소를 원함");
            }}
            disabled={loading}
            className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading
              ? "처리 중..."
              : tossCancel.environment === "TEST"
                ? `전액 취소 (${tossCancel.balance.toLocaleString()}원)`
                : `취소 (${Number(amount || 0).toLocaleString()}원)`}
          </button>
        </div>
      ) : null}

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
            onClick={() => void handleRefund(total, reason || "구매자가 취소를 원함")}
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
