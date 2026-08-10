"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { TrustButton, TrustButtonLink } from "@/components/corporate-trust/app-trust-ui";
import { CheckInShareReportView } from "@/components/checkin/check-in-share-report-view";
import { Typography } from "@/components/typography/typography";
import type { CheckInShareGrantPreview } from "@/lib/checkin-share/types";

type CheckInShareRespondPanelProps = {
  preview: CheckInShareGrantPreview;
};

export function CheckInShareRespondPanel({ preview }: CheckInShareRespondPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  async function respond(decision: "ACCEPT" | "DECLINE") {
    setLoading(decision === "ACCEPT" ? "accept" : "decline");
    setError(null);

    try {
      const response = await fetch(`/api/checkin/share-grants/${preview.grantId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "처리에 실패했습니다.");
        return;
      }

      setDone(decision === "ACCEPT" ? "accepted" : "declined");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  }

  if (done === "accepted") {
    return (
      <div className="check-in-share-respond__done">
        <Typography as="p" role="body" weight="semibold" color="primary">
          체크인 공유를 수락했습니다.
        </Typography>
        <Typography as="p" role="bodySecondary" color="secondary">
          코치가 피드백을 준비하면 코칭 탭에서 확인할 수 있습니다.
        </Typography>
        <TrustButtonLink href="/coaching" variant="secondary">
          코칭으로 이동
        </TrustButtonLink>
      </div>
    );
  }

  if (done === "declined") {
    return (
      <div className="check-in-share-respond__done">
        <Typography as="p" role="body" weight="semibold" color="primary">
          공유 요청을 거절했습니다.
        </Typography>
        <TrustButtonLink href="/checkin" variant="secondary">
          체크인으로 돌아가기
        </TrustButtonLink>
      </div>
    );
  }

  if (preview.status !== "PENDING") {
    return (
      <Typography as="p" role="bodySecondary" color="secondary">
        이 요청은 이미 처리되었습니다.
      </Typography>
    );
  }

  return (
    <div className="check-in-share-respond">
      <header className="check-in-share-respond__header">
        <Typography as="p" role="caption" weight="medium" color="action">
          {preview.coachName} · {preview.sessionNo}회차
        </Typography>
        <Typography as="h1" role="pageTitle" weight="semibold" color="primary">
          체크인 공유 요청
        </Typography>
        {preview.coachMessage && (
          <Typography as="p" role="bodySecondary" color="secondary" className="check-in-share-respond__message">
            {preview.coachMessage}
          </Typography>
        )}
      </header>

      <CheckInShareReportView content={preview.content} mode="preview" />

      {!preview.canAccept && (
        <Typography as="p" role="bodySecondary" color="secondary" className="check-in-share-respond__warn">
          선택한 기간에 공유할 체크인 기록이 없습니다. 기록을 작성한 뒤 다시 확인해 주세요.
        </Typography>
      )}

      <div className="check-in-share-respond__actions">
        <TrustButton
          type="button"
          variant="primary"
          disabled={loading !== null || !preview.canAccept}
          onClick={() => respond("ACCEPT")}
        >
          {loading === "accept" ? "처리 중..." : "수락하고 공유하기"}
        </TrustButton>
        <TrustButton
          type="button"
          variant="secondary"
          disabled={loading !== null}
          onClick={() => respond("DECLINE")}
        >
          {loading === "decline" ? "처리 중..." : "거절"}
        </TrustButton>
      </div>

      {error && (
        <Typography as="p" role="caption" color="primary" className="check-in-share-respond__error">
          {error}
        </Typography>
      )}
    </div>
  );
}
