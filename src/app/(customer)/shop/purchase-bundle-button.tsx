"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PurchaseBundleButtonProps = {
  productId: string;
  priceLabel: string;
  disabled?: boolean;
  label?: string;
};

export function PurchaseBundleButton({
  productId,
  priceLabel,
  disabled = false,
  label = "구매하기",
}: PurchaseBundleButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePurchase() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          idempotencyKey: `checkout-${productId}-${Date.now()}`,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "구매에 실패했습니다.");
        return;
      }

      router.push("/learning?purchased=1");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handlePurchase}
        disabled={disabled || loading}
        className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "결제 처리 중..." : `${label} · ${priceLabel}`}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
