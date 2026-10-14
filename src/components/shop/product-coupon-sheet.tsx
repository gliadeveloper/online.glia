"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { formatKrw } from "@/lib/customer-labels";
import type { ProductCouponCard } from "@/lib/shop-coupon";

type ProductCouponSheetProps = {
  productId: string;
  isLoggedIn: boolean;
  coupons: ProductCouponCard[];
};

export function ProductCouponSheet({ productId, isLoggedIn, coupons }: ProductCouponSheetProps) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loadingId, setLoadingId] = useState<string | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loadingId) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loadingId, open]);

  if (coupons.length === 0) return null;

  const best = coupons.reduce((max, coupon) => Math.max(max, coupon.discountWon), 0);
  const canDownload = coupons.some((coupon) => coupon.downloadState === "ready" || coupon.downloadState === "login");
  const loginHref = `/login?next=${encodeURIComponent(`/shop/${productId}`)}`;

  async function download(couponIds: string[], scope: string | "all") {
    if (!isLoggedIn) {
      window.location.href = loginHref;
      return;
    }
    setLoadingId(scope);
    setError(null);
    try {
      const response = await fetch(`/api/shop/products/${productId}/coupons/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponIds }),
      });
      const data = (await response.json()) as { error?: string | null };
      if (!response.ok) {
        setError(data.error ?? "쿠폰을 받지 못했습니다.");
        return;
      }
      if (data.error) setError(data.error);
      router.refresh();
    } catch {
      setError("쿠폰을 받지 못했습니다.");
    } finally {
      setLoadingId(null);
    }
  }

  const sheet =
    open && mounted
      ? createPortal(
          <div
            className="shop-pdp-modal shop-coupon-sheet"
            role="presentation"
            onClick={() => {
              if (!loadingId) setOpen(false);
            }}
          >
            <div
              className="shop-pdp-modal__panel shop-coupon-sheet__panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="shop-coupon-sheet__head">
                <h2 id={titleId} className="shop-pdp-modal__title">
                  쿠폰 받기
                </h2>
                <button
                  type="button"
                  className="shop-coupon-sheet__close"
                  onClick={() => setOpen(false)}
                  disabled={loadingId != null}
                >
                  닫기
                </button>
              </div>
              <ul className="shop-coupon-sheet__list">
                {coupons.map((coupon) => {
                  const owned = coupon.downloadState === "owned";
                  const busy = loadingId === coupon.id || loadingId === "all";
                  return (
                    <li key={coupon.id} className="shop-coupon-card">
                      <p className="shop-coupon-card__benefit">{coupon.benefitLabel}</p>
                      <p className="shop-coupon-card__name">{coupon.name}</p>
                      <p className="shop-coupon-card__meta">
                        {coupon.conditionLabel} · {coupon.periodLabel}
                      </p>
                      <button
                        type="button"
                        className="shop-coupon-card__button"
                        disabled={owned || busy}
                        onClick={() => void download([coupon.id], coupon.id)}
                      >
                        {owned ? "받기 완료" : busy ? "받는 중…" : "받기"}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {error ? <p className="shop-pdp-apply-error">{error}</p> : null}
              <button
                type="button"
                className="shop-pdp-apply-btn"
                disabled={!canDownload || loadingId != null}
                onClick={() =>
                  void download(
                    coupons.filter((coupon) => coupon.downloadState === "ready").map((coupon) => coupon.id),
                    "all",
                  )
                }
              >
                {loadingId === "all" ? "받는 중…" : "전체 받기"}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button type="button" className="glia-pdp__coupon" onClick={() => setOpen(true)}>
        <span>{best > 0 ? `최대 ${formatKrw(best)} 할인` : "받을 수 있는 쿠폰"}</span>
        <span className="glia-pdp__coupon-action">{canDownload ? "쿠폰 받기" : "받은 쿠폰"}</span>
      </button>
      {sheet}
    </>
  );
}
