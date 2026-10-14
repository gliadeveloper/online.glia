"use client";

import { useEffect, useRef, useState } from "react";
import type { TossPaymentsWidgets, WidgetAgreementWidget, WidgetPaymentMethodWidget } from "@tosspayments/tosspayments-sdk";

import type { TossWidgetPaymentRequest } from "@/lib/payments/toss/widget";
import { tossSdkErrorMessage } from "@/lib/payments/toss/verify";

type ProductWidgetCheckoutProps = {
  productId: string;
  couponIssueId: string | null;
  clientKey: string;
  variantKey: string;
  customerKey: string;
  amount: number;
};

const METHOD_SELECTOR = "#toss-payment-method";
const AGREEMENT_SELECTOR = "#toss-agreement";

export function ProductWidgetCheckout({
  productId,
  couponIssueId,
  clientKey,
  variantKey,
  customerKey,
  amount,
}: ProductWidgetCheckoutProps) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const amountRef = useRef(amount);
  const redirectingRef = useRef(false);
  const activeRef = useRef(true);
  amountRef.current = amount;

  useEffect(() => {
    const onPageHide = () => {
      redirectingRef.current = true;
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const rendered: Array<WidgetPaymentMethodWidget | WidgetAgreementWidget> = [];
    activeRef.current = true;

    async function mount() {
      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const tossPayments = await loadTossPayments(clientKey);
      const widgets = tossPayments.widgets({ customerKey });
      if (cancelled) return;
      await widgets.setAmount({ currency: "KRW", value: amountRef.current });
      if (cancelled) return;
      const [methods, agreement] = await Promise.all([
        widgets.renderPaymentMethods({ selector: METHOD_SELECTOR, variantKey }),
        widgets.renderAgreement({ selector: AGREEMENT_SELECTOR, variantKey: "AGREEMENT" }),
      ]);
      rendered.push(methods, agreement);
      if (cancelled) return;
      widgetsRef.current = widgets;
      setReady(true);
    }

    void mount().catch((caught) => {
      if (!cancelled) setError(tossSdkErrorMessage(caught));
    });

    return () => {
      cancelled = true;
      activeRef.current = false;
      setReady(false);
      widgetsRef.current = null;
      if (redirectingRef.current) return;
      for (const widget of rendered) {
        void widget.destroy().catch(() => undefined);
      }
    };
  }, [clientKey, customerKey, variantKey]);

  useEffect(() => {
    const widgets = widgetsRef.current;
    if (!ready || !widgets) return;
    let cancelled = false;
    void widgets
      .setAmount({ currency: "KRW", value: amount })
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((caught) => {
        if (!cancelled) setError(tossSdkErrorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [amount, ready]);

  async function handlePay() {
    const widgets = widgetsRef.current;
    if (window.top !== window.self) {
      setError("결제창은 페이지 안에서 바로 열어 주세요.");
      return;
    }
    if (!widgets) {
      setError("결제 화면을 아직 불러오지 못했습니다.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/toss/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, couponIssueId }),
      });
      const data = (await response.json()) as TossWidgetPaymentRequest & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "결제를 시작하지 못했습니다.");
        return;
      }
      if (data.amount.currency !== "KRW" || data.amount.value !== amount) {
        setError("결제 금액이 주문과 다릅니다.");
        return;
      }

      redirectingRef.current = true;
      await widgets.requestPayment({
        orderId: data.orderId,
        orderName: data.orderName,
        successUrl: data.successUrl,
        failUrl: data.failUrl,
        customerEmail: data.customerEmail ?? undefined,
        customerName: data.customerName ?? undefined,
      });
    } catch (caught) {
      redirectingRef.current = false;
      if (!activeRef.current) return;
      setError(tossSdkErrorMessage(caught));
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }

  return (
    <div className="glia-checkout__widget">
      <div id="toss-payment-method" className="glia-checkout__widget-slot" />
      <div id="toss-agreement" className="glia-checkout__widget-slot" />
      <button type="button" className="shop-pdp-apply-btn" onClick={handlePay} disabled={!ready || loading}>
        {loading ? "결제창 여는 중…" : "결제하기"}
      </button>
      {error ? <p className="glia-checkout__notice">{error}</p> : null}
    </div>
  );
}
