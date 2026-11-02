"use client";

import { useEffect, useRef, useState } from "react";

import { MemberContactForm } from "@/components/account/member-contact-form";
import type { MemberContactSnapshot } from "@/lib/member-contact";

import "./contact-prompt.css";

const DISMISS_KEY = "glia.contactPrompt.dismissedUserId";

export function clearContactPromptDismissal() {
  sessionStorage.removeItem(DISMISS_KEY);
}

export function ContactPrompt({
  userId,
  contact,
}: {
  userId: string;
  contact: MemberContactSnapshot;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) === userId) return;
    setOpen(true);
  }, [userId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, userId);
    setOpen(false);
  }

  return (
    <dialog
      ref={dialogRef}
      className="contact-prompt"
      aria-labelledby="contact-prompt-title"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) dismiss();
      }}
    >
      <div className="contact-prompt__body">
        <header>
          <p className="contact-prompt__kicker">회원 정보</p>
          <h2 id="contact-prompt-title" className="contact-prompt__title">
            성명과 휴대폰 번호를 입력해 주세요
          </h2>
          <p className="contact-prompt__copy">
            수업 알림을 받으려면 성명과 휴대폰 번호가 필요합니다. 커뮤니티에는 공개되지 않습니다.
          </p>
        </header>
        <MemberContactForm
          initial={contact}
          variant="prompt"
          nameLabel="성명"
          showEmail={contact.needsEmail}
          lede={null}
          submitLabel="저장"
          onSaved={() => setOpen(false)}
        />
        <button type="button" className="contact-prompt__later" onClick={dismiss}>
          나중에
        </button>
      </div>
    </dialog>
  );
}
