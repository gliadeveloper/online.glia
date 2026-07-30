"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PurchaseProductButtonProps = {
  productSlug: string;
  priceLabel: string;
  disabled?: boolean;
  label?: string;
  redirectTo?: string;
  compact?: boolean;
};

export function PurchaseProductButton({
  productSlug,
  priceLabel,
  disabled = false,
  label = "구매하기",
  redirectTo,
  compact = false,
}: PurchaseProductButtonProps) {
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
          productSlug,
          idempotencyKey: `checkout-${productSlug}-${Date.now()}`,
        }),
      });

      const data = (await response.json()) as { error?: string; id?: string };

      if (!response.ok) {
        const code = (data as { code?: string }).code;
        if (code === "ALREADY_OWNED") {
          setError("이미 보유 중인 수강권입니다. 내 학습에서 확인해 주세요.");
          return;
        }
        setError(data.error ?? "구매에 실패했습니다.");
        return;
      }

      if (redirectTo) {
        router.push(redirectTo);
      } else if (data.id) {
        router.push(`/orders/${data.id}?purchased=1`);
      } else {
        router.push("/orders");
      }
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
        className={`shell-focus-ring w-full rounded-[var(--radius-md)] bg-[var(--color-action-primary)] font-medium text-white hover:bg-[var(--color-action-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 ${
          compact ? "min-h-11 px-4 py-2 typo-subTypography11" : "min-h-11 px-5 py-3 typo-subTypography11"
        }`}
      >
        {loading ? "결제 처리 중..." : `${label} · ${priceLabel}`}
      </button>
      {error && (
        <p role="alert" className="typo-subTypography11 text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
