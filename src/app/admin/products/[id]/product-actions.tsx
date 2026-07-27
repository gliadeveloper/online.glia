"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProductActionsProps = {
  productId: string;
  isActive: boolean;
};

export function ProductActions({ productId, isActive }: ProductActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isActive ? "deactivate" : "activate" }),
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
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggleActive}
        disabled={loading}
        className={`rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-60 ${
          isActive
            ? "border border-amber-200 bg-amber-50 text-amber-800"
            : "bg-emerald-600 text-white"
        }`}
      >
        {loading ? "처리 중..." : isActive ? "비활성화" : "활성화"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
