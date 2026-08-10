"use client";

import { useState, useTransition } from "react";

import { postReportReasonLabels } from "@/lib/post-report-labels";

type CommunityReportButtonProps = {
  targetType: "POST" | "COMMENT";
  postSlug: string;
  commentId?: string;
  isLoggedIn: boolean;
  className?: string;
};

export function CommunityReportButton({
  targetType,
  postSlug,
  commentId,
  isLoggedIn,
  className,
}: CommunityReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<keyof typeof postReportReasonLabels>("SPAM");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return null;
  }

  function handleSubmit() {
    startTransition(async () => {
      setError(null);

      const endpoint =
        targetType === "POST"
          ? `/api/posts/${postSlug}/report`
          : `/api/posts/${postSlug}/comments/${commentId}/report`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, detail: detail.trim() || undefined }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "신고에 실패했습니다.");
        return;
      }

      setDone(true);
      setOpen(false);
    });
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={pending || done}
        className="community-report-btn shell-focus-ring"
      >
        {done ? "신고됨" : "신고"}
      </button>

      {open && !done && (
        <div className="community-report-panel">
          <p className="community-report-panel__title">신고 사유</p>
          <div className="community-report-panel__reasons">
            {(Object.keys(postReportReasonLabels) as Array<keyof typeof postReportReasonLabels>).map(
              (value) => (
                <label key={value} className="community-report-panel__reason">
                  <input
                    type="radio"
                    name={`report-${targetType}-${commentId ?? postSlug}`}
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                  />
                  <span>{postReportReasonLabels[value]}</span>
                </label>
              ),
            )}
          </div>
          <textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder="추가 설명 (선택)"
            rows={2}
            maxLength={500}
            className="community-report-panel__detail corp-trust-input corp-trust-focus shell-focus-ring"
          />
          <div className="community-report-panel__actions">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              className="community-report-panel__submit shell-focus-ring"
            >
              {pending ? "전송 중…" : "신고하기"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="community-report-panel__cancel shell-focus-ring"
            >
              취소
            </button>
          </div>
          {error && (
            <p role="alert" className="community-report-panel__error">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
