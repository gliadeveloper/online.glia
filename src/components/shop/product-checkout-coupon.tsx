"use client";

import { useState } from "react";

export function ProductCheckoutCoupon() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function applyCoupon() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/shop/coupons/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as { error?: string };
      setMessage(data.error ?? "쿠폰을 확인하지 못했습니다.");
    } catch {
      setMessage("쿠폰을 확인하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="glia-checkout__coupon"
      onSubmit={(event) => {
        event.preventDefault();
        void applyCoupon();
      }}
    >
      <label className="glia-checkout__label" htmlFor="checkout-coupon">
        쿠폰
      </label>
      <div className="glia-checkout__coupon-row">
        <input
          id="checkout-coupon"
          className="glia-checkout__input"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="쿠폰 코드"
          autoComplete="off"
          maxLength={40}
          disabled={loading}
        />
        <button type="submit" className="glia-checkout__apply" disabled={loading || code.trim().length === 0}>
          {loading ? "확인 중…" : "적용"}
        </button>
      </div>
      {message ? <p className="glia-checkout__coupon-message">{message}</p> : null}
    </form>
  );
}
