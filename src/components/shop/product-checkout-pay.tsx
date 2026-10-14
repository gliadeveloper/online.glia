"use client";

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
  const best = coupons.reduce<CheckoutCouponOption | null>(
    (current, coupon) => (current == null || coupon.discountWon > current.discountWon ? coupon : current),
    null,
  );
  const [issueId, setIssueId] = useState<string | null>(best?.issueId ?? null);
  const selected = coupons.find((coupon) => coupon.issueId === issueId) ?? null;
  const discount = selected?.discountWon ?? 0;
  const payable = basePrice - discount;

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
        {coupons.length === 0 ? (
          <p className="glia-checkout__coupon-empty">
            {canDownloadMore ? (
              <>
                받은 쿠폰이 없습니다. <a href={productHref}>상품 상세에서 쿠폰을 받아 주세요.</a>
              </>
            ) : (
              "이 상품에 사용할 쿠폰이 없습니다."
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
            {coupons.map((coupon) => (
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
