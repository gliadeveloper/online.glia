"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { MemberContactSnapshot } from "@/lib/member-contact";

import "@/components/account/member-contact-form.css";

type MemberContactFormProps = {
  initial: MemberContactSnapshot;
  variant?: "page" | "checkout" | "modal";
  submitLabel?: string;
  onSaved?: () => void;
};

export function MemberContactForm({
  initial,
  variant = "page",
  submitLabel = "저장",
  onSaved,
}: MemberContactFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [phoneNumber, setPhoneNumber] = useState(initial.phoneNumber);
  const [email, setEmail] = useState(initial.email);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch("/api/me/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phoneNumber,
          ...(initial.needsEmail ? { email } : {}),
        }),
      });
      const data = (await response.json()) as { error?: string; contact?: MemberContactSnapshot };
      if (!response.ok) {
        setError(data.error ?? "연락처를 저장하지 못했습니다.");
        return;
      }

      setSuccess(true);
      if (data.contact) {
        setName(data.contact.name);
        setPhoneNumber(data.contact.phoneNumber);
        setEmail(data.contact.email);
      }
      onSaved?.();
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const formClass =
    variant === "checkout"
      ? "glia-checkout__contact member-contact-form"
      : variant === "modal"
        ? "member-contact-form member-contact-form--modal"
        : "glia-mypage__form";

  return (
    <form onSubmit={handleSubmit} className={formClass}>
      {variant !== "modal" ? (
        <p className={variant === "checkout" ? "glia-checkout__contact-lede" : "glia-mypage__section-lede"}>
          결제 영수증과 코칭 안내는 이름과 연락처로 보내 드려요. 커뮤니티에는 공개되지 않습니다.
        </p>
      ) : (
        <p className="member-contact-form__lede">
          신청·결제 전에 이름과 연락처를 남겨 주세요. 커뮤니티에는 공개되지 않습니다.
        </p>
      )}

      <fieldset className={variant === "page" ? "glia-mypage__fieldset" : "member-contact-form__fields"}>
        <label className={variant === "page" ? "glia-mypage__field" : "member-contact-form__field"}>
          <span className={variant === "page" ? "glia-mypage__label" : "member-contact-form__label"}>
            이름 <span className={variant === "page" ? "glia-mypage__req" : "member-contact-form__req"}>필수</span>
          </span>
          <input
            className={variant === "page" ? "glia-mypage__input" : "member-contact-form__input"}
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={20}
          />
        </label>

        <label className={variant === "page" ? "glia-mypage__field" : "member-contact-form__field"}>
          <span className={variant === "page" ? "glia-mypage__label" : "member-contact-form__label"}>
            휴대폰 번호 <span className={variant === "page" ? "glia-mypage__req" : "member-contact-form__req"}>필수</span>
          </span>
          <input
            className={variant === "page" ? "glia-mypage__input" : "member-contact-form__input"}
            type="tel"
            autoComplete="tel"
            inputMode="numeric"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder="010-0000-0000"
            required
          />
        </label>

        <label className={variant === "page" ? "glia-mypage__field" : "member-contact-form__field"}>
          <span className={variant === "page" ? "glia-mypage__label" : "member-contact-form__label"}>
            이메일
            {initial.needsEmail ? (
              <span className={variant === "page" ? "glia-mypage__req" : "member-contact-form__req"}> 필수</span>
            ) : null}
          </span>
          <input
            className={variant === "page" ? "glia-mypage__input" : "member-contact-form__input"}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required={initial.needsEmail}
            readOnly={!initial.needsEmail}
          />
          {!initial.needsEmail ? (
            <span className={variant === "page" ? "glia-mypage__photo-hint" : "member-contact-form__hint"}>
              로그인 이메일은 여기서 바꿀 수 없습니다.
            </span>
          ) : null}
        </label>
      </fieldset>

      {error ? (
        <p role="alert" className={variant === "page" ? "glia-mypage__alert glia-mypage__alert--error" : "member-contact-form__error"}>
          {error}
        </p>
      ) : null}
      {success && variant === "page" ? (
        <p className="glia-mypage__alert glia-mypage__alert--ok">회원 정보가 저장되었습니다.</p>
      ) : null}

      <div className={variant === "page" ? "glia-mypage__actions" : "member-contact-form__actions"}>
        <button
          type="submit"
          disabled={loading}
          className={
            variant === "page"
              ? "glia-mypage__btn glia-mypage__btn--primary"
              : variant === "checkout"
                ? "shop-pdp-apply-btn"
                : "shop-pdp-apply-btn shop-pdp-modal__confirm"
          }
        >
          {loading ? "저장 중…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
