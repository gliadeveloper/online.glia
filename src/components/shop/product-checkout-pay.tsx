"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProductWidgetCheckout } from "@/components/shop/product-widget-checkout";
import { formatKrw } from "@/lib/customer-labels";
import type { CheckoutCouponOption } from "@/lib/shop-coupon";

type ProductCheckoutPayProps = {
  productId: string;
  productHref: string;
  basePrice: number;
  coupons: CheckoutCouponOption[];
  canDownloadMore: boolean;
  clientKey: string;
  variantKey: string;
  customerKey: string;
};

export function ProductCheckoutPay({
  productId,
  productHref,
  basePrice,
  coupons,
  canDownloadMore,
  clientKey,
  variantKey,
  customerKey,
}: ProductCheckoutPayProps) {
  const router = useRouter();
  const best = coupons.reduce<CheckoutCouponOption | null>(
    (current, coupon) => (current == null || coupon.discountWon > current.discountWon ? coupon : current),
    null,
  );
  const [issueId, setIssueId] = useState<string | null>(best?.issueId ?? null);
  const [received, setReceived] = useState<CheckoutCouponOption[]>([]);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeMessage, setCodeMessage] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const options = [...coupons];
  for (const coupon of received) {
    if (!options.some((item) => item.issueId === coupon.issueId)) options.push(coupon);
  }
  const selected = options.find((coupon) => coupon.issueId === issueId) ?? null;
  const discount = selected?.discountWon ?? 0;
  const payable = basePrice - discount;

  async function redeemCode(event: React.FormEvent) {
    event.preventDefault();
    if (redeeming) return;
    setRedeeming(true);
    setCodeError(null);
    setCodeMessage(null);
    try {
      const response = await fetch(`/api/shop/products/${productId}/coupons/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as {
        error?: string;
        alreadyOwned?: boolean;
        option?: CheckoutCouponOption;
      };
      if (!response.ok || !data.option) {
        setCodeError(data.error ?? "쿠폰 번호를 확인해 주세요.");
        return;
      }
      setReceived((current) =>
        current.some((coupon) => coupon.issueId === data.option?.issueId) ? current : [...current, data.option!],
      );
      setIssueId(data.option.issueId);
      setCode("");
      setCodeMessage(
        data.alreadyOwned
          ? "이미 받은 쿠폰입니다. 아래에서 선택해 결제해 주세요."
          : "쿠폰을 받았습니다. 아래에서 선택해 결제해 주세요.",
      );
      router.refresh();
    } catch {
      setCodeError("쿠폰 번호를 확인하지 못했습니다.");
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <>
      <section className="glia-checkout__summary" aria-label="결제 금액">
        <p className="glia-checkout__price-row">
          <span>상품 금액</span>
          <strong>{formatKrw(basePrice)}</strong>
        </p>
        {discount > 0 ? (
          <p className="glia-checkout__price-row">
            <span>쿠폰 할인</span>
            <strong>−{formatKrw(discount)}</strong>
          </p>
        ) : null}
        <p className="glia-checkout__price-row">
          <span>결제 금액</span>
          <strong>{formatKrw(payable)}</strong>
        </p>
      </section>

      <fieldset className="glia-checkout__coupon">
        <legend className="glia-checkout__label">쿠폰</legend>
        <form className="glia-checkout__coupon-code" onSubmit={redeemCode}>
          <label>
            쿠폰 번호
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="받은 번호"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={32}
            />
          </label>
          <button type="submit" disabled={redeeming || code.trim().length === 0}>
            {redeeming ? "확인 중" : "받기"}
          </button>
        </form>
        {codeError ? <p className="glia-checkout__coupon-message">{codeError}</p> : null}
        {codeMessage ? <p className="glia-checkout__coupon-note">{codeMessage}</p> : null}
        {options.length === 0 ? (
          <p className="glia-checkout__coupon-empty">
            {canDownloadMore ? (
              <>
                받은 쿠폰이 없습니다. 번호를 입력하거나 <a href={productHref}>상품 상세에서 받아 주세요.</a>
              </>
            ) : (
              "받은 쿠폰이 없습니다. 쿠폰 번호가 있으면 위에 입력해 주세요."
            )}
          </p>
        ) : (
          <div className="glia-checkout__coupon-options" role="radiogroup" aria-label="사용할 쿠폰">
            <label className="glia-checkout__coupon-option">
              <input
                type="radio"
                name="checkout-coupon"
                checked={issueId == null}
                onChange={() => setIssueId(null)}
              />
              <span>사용 안 함</span>
            </label>
            {options.map((coupon) => (
              <label key={coupon.issueId} className="glia-checkout__coupon-option">
                <input
                  type="radio"
                  name="checkout-coupon"
                  checked={issueId === coupon.issueId}
                  onChange={() => setIssueId(coupon.issueId)}
                />
                <span>
                  <strong>
                    {coupon.name} · {coupon.benefitLabel}
                  </strong>
                  <small>
                    −{formatKrw(coupon.discountWon)} · {coupon.conditionLabel} · {coupon.periodLabel}
                  </small>
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="glia-checkout__pay">
        <ProductWidgetCheckout
          productId={productId}
          couponIssueId={selected?.issueId ?? null}
          clientKey={clientKey}
          variantKey={variantKey}
          customerKey={customerKey}
          amount={payable}
        />
      </div>
    </>
  );
}
