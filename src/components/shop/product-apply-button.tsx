"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { MemberContactForm } from "@/components/account/member-contact-form";
import type { MemberContactSnapshot } from "@/lib/member-contact";

type ProductApplyButtonProps = {
  productId: string;
  label?: string;
  isLoggedIn: boolean;
  compact?: boolean;
  className?: string;
  disabled?: boolean;
  pendingOrderId?: string;
  productTitle?: string;
  priceLabel?: string;
};

export function ProductApplyButton({
  productId,
  label = "신청하기",
  isLoggedIn,
  compact = false,
  className,
  disabled = false,
  pendingOrderId,
  productTitle,
  priceLabel,
}: ProductApplyButtonProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(pendingOrderId ?? null);
  const [contact, setContact] = useState<MemberContactSnapshot | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!confirmOpen && !doneOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        setConfirmOpen(false);
        setDoneOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen, doneOpen, loading]);

  const isPending = disabled || !!submittedOrderId;

  function handleClick() {
    if (isPending) {
      if (submittedOrderId) {
        router.push(`/orders/${submittedOrderId}`);
      }
      return;
    }

    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/shop/${productId}`)}`);
      return;
    }

    setError(null);
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/shop/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          idempotencyKey: `apply-${productId}-${Date.now()}`,
        }),
      });

      const data = (await response.json()) as { error?: string; id?: string; code?: string };

      if (!response.ok) {
        if (data.code === "CONTACT_REQUIRED") {
          const contactResponse = await fetch("/api/me/contact");
          const contactData = (await contactResponse.json()) as { contact?: MemberContactSnapshot };
          if (contactData.contact) {
            setContact(contactData.contact);
            setLoading(false);
            return;
          }
        }
        setConfirmOpen(false);
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
      setConfirmOpen(false);
      setDoneOpen(true);
      router.refresh();
    } catch {
      setConfirmOpen(false);
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
          "shop-pdp-apply-btn",
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

      {mounted && confirmOpen
        ? createPortal(
            <div
              className="shop-pdp-modal"
              role="presentation"
              onClick={() => {
                if (!loading) setConfirmOpen(false);
              }}
            >
              <div
                className="shop-pdp-modal__panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="apply-confirm-title"
                onClick={(event) => event.stopPropagation()}
              >
                {contact && !contact.complete ? (
                  <>
                    <h2 id="apply-confirm-title" className="shop-pdp-modal__title">
                      신청 전에 연락처를 남겨 주세요
                    </h2>
                    <MemberContactForm
                      initial={contact}
                      variant="modal"
                      submitLabel="저장하고 신청하기"
                      onSaved={() => {
                        void handleConfirm();
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmOpen(false);
                        setContact(null);
                      }}
                      disabled={loading}
                      className="shop-pdp-modal__dismiss shell-focus-ring"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <h2 id="apply-confirm-title" className="shop-pdp-modal__title">
                      이 프로그램으로 신청할까요?
                    </h2>
                    <p className="shop-pdp-modal__body">
                      {productTitle ? <strong className="shop-pdp-modal__product">{productTitle}</strong> : null}
                      {priceLabel ? <span className="shop-pdp-modal__price">{priceLabel}</span> : null}
                      신청 후 코치가 확인하면 수강이 시작됩니다. 지금 결제가 진행되지는 않습니다.
                    </p>
                    <div className="shop-pdp-modal__actions">
                      <button
                        type="button"
                        className="shop-pdp-apply-btn shop-pdp-modal__confirm"
                        onClick={handleConfirm}
                        disabled={loading}
                      >
                        {loading ? "신청 중…" : "신청하기"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmOpen(false)}
                        disabled={loading}
                        className="shop-pdp-modal__dismiss shell-focus-ring"
                      >
                        취소
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

      {mounted && doneOpen && submittedOrderId
        ? createPortal(
            <div className="shop-pdp-modal" role="presentation" onClick={() => setDoneOpen(false)}>
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
                    className="shop-pdp-apply-btn shop-pdp-modal__confirm"
                    onClick={() => setDoneOpen(false)}
                  >
                    신청 내역 보기
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDoneOpen(false)}
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
