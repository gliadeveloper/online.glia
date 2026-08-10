"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ProductApplyButtonProps = {
  productSlug: string;
  label?: string;
  isLoggedIn: boolean;
  compact?: boolean;
  className?: string;
  disabled?: boolean;
  pendingOrderId?: string;
};

export function ProductApplyButton({
  productSlug,
  label = "신청하기",
  isLoggedIn,
  compact = false,
  className,
  disabled = false,
  pendingOrderId,
}: ProductApplyButtonProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(pendingOrderId ?? null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isPending = disabled || !!submittedOrderId;

  async function handleClick() {
    if (isPending) {
      if (submittedOrderId) {
        router.push(`/orders/${submittedOrderId}`);
      }
      return;
    }

    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/shop/${productSlug}`)}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/shop/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug,
          idempotencyKey: `apply-${productSlug}-${Date.now()}`,
        }),
      });

      const data = (await response.json()) as { error?: string; id?: string; code?: string };

      if (!response.ok) {
        if (data.code === "APPLICATION_PENDING" || data.code === "ALREADY_OWNED") {
          setError(data.error ?? "신청할 수 없습니다.");
        } else {
          setError(data.error ?? "신청에 실패했습니다.");
        }
        return;
      }

      if (data.id) {
        setSubmittedOrderId(data.id);
      }
      setOpen(true);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || isPending}
        className={[
          "shop-pdp-apply-btn corp-trust-focus shell-focus-ring",
          compact ? "shop-pdp-apply-btn--compact" : "",
          isPending ? "shop-pdp-apply-btn--pending" : "",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {loading ? "신청 중…" : isPending ? "승인 대기 중" : label}
      </button>

      {error ? (
        <p role="alert" className="shop-pdp-apply-error">
          {error}
        </p>
      ) : null}

      {mounted && open && submittedOrderId
        ? createPortal(
            <div className="shop-pdp-modal" role="presentation" onClick={() => setOpen(false)}>
              <div
                className="shop-pdp-modal__panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="apply-modal-title"
                onClick={(event) => event.stopPropagation()}
              >
                <h2 id="apply-modal-title" className="shop-pdp-modal__title">
                  신청이 접수되었습니다
                </h2>
                <p className="shop-pdp-modal__body">
                  코치가 확인 후 승인해 드립니다.
                  <br />
                  승인 완료 시 내 학습에서 수강을 시작하실 수 있어요.
                </p>
                <div className="shop-pdp-modal__actions">
                  <Link
                    href={`/orders/${submittedOrderId}`}
                    className="shop-pdp-apply-btn shop-pdp-modal__confirm corp-trust-focus shell-focus-ring"
                    onClick={() => setOpen(false)}
                  >
                    신청 내역 보기
                  </Link>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="shop-pdp-modal__dismiss shell-focus-ring"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
