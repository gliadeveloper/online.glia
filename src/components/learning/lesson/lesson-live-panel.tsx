"use client";

import { useCallback, useEffect, useState } from "react";

import { LessonLiveRoom } from "@/components/learning/lesson/lesson-live-room";
import type { LiveSessionView } from "@/lib/live-session";
import { buildLiveCountdown, formatScheduledLabel } from "@/lib/live-session";

type LessonLivePanelProps = {
  lessonId: string;
  courseSlug: string;
  initialSession: LiveSessionView;
};

export function LessonLivePanel({ lessonId, courseSlug, initialSession }: LessonLivePanelProps) {
  const [session, setSession] = useState(initialSession);
  const [countdownLabel, setCountdownLabel] = useState(initialSession.countdown?.label ?? null);

  const refreshStatus = useCallback(async () => {
    try {
      const params = new URLSearchParams({ courseSlug });
      const response = await fetch(
        `/api/learning/lessons/${lessonId}/live-status?${params.toString()}`,
      );
      const data = (await response.json()) as LiveSessionView;
      if (response.ok) {
        setSession(data);
      }
    } catch {
      // Keep last known state while polling.
    }
  }, [courseSlug, lessonId]);

  useEffect(() => {
    if (session.canJoin || session.sessionStatus === "ENDED" || !session.scheduledAt) {
      return;
    }

    const tick = () => {
      const next = buildLiveCountdown(session.scheduledAt!);
      setCountdownLabel(next?.label ?? null);
    };

    tick();
    const interval = window.setInterval(tick, 60_000);
    return () => window.clearInterval(interval);
  }, [session.canJoin, session.scheduledAt, session.sessionStatus]);

  useEffect(() => {
    if (session.canJoin || session.sessionStatus === "ENDED") {
      return;
    }

    const interval = window.setInterval(refreshStatus, 15_000);
    return () => window.clearInterval(interval);
  }, [refreshStatus, session.canJoin, session.sessionStatus]);

  if (!session.configured || !session.scheduledAt) {
    return (
      <div className="lesson-live-waiting rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-8 text-center">
        <p className="typo-subTypography11 text-[var(--color-text-secondary)]">
          라이브 일정이 아직 등록되지 않았습니다.
        </p>
      </div>
    );
  }

  if (session.sessionStatus === "ENDED") {
    return (
      <div className="lesson-live-waiting rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-8 text-center">
        <p className="typo-subTypography10 font-medium text-[var(--color-text-primary)]">
          라이브 수업이 종료되었습니다
        </p>
        {session.scheduledLabel && (
          <p className="mt-2 typo-subTypography11 text-[var(--color-text-secondary)]">
            {session.scheduledLabel}
          </p>
        )}
      </div>
    );
  }

  if (!session.canJoin) {
    const scheduledLabel = session.scheduledLabel ?? formatScheduledLabel(session.scheduledAt);

    return (
      <div className="lesson-live-waiting overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-sm">
        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-6 py-5 text-center">
          <p className="typo-subTypography12 font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
            라이브 예정
          </p>
          {scheduledLabel && (
            <p className="mt-2 typo-subTypography9 font-semibold text-[var(--color-text-primary)]">
              {scheduledLabel}
            </p>
          )}
        </div>
        <div className="px-6 py-10 text-center">
          <p className="typo-subTypography4 font-semibold text-[var(--color-action-primary)]">
            {countdownLabel ?? session.countdown?.label ?? "0시간 남았습니다"}
          </p>
          <p className="mt-3 typo-subTypography11 text-[var(--color-text-secondary)]">
            코치가 라이브 수업을 시작하면 입장할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return <LessonLiveRoom lessonId={lessonId} courseSlug={courseSlug} />;
}
