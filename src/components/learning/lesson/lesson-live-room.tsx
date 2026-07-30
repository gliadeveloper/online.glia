"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useEffect, useState } from "react";

type LessonLiveRoomProps = {
  lessonId: string;
  courseSlug: string;
};

export function LessonLiveRoom({ lessonId, courseSlug }: LessonLiveRoomProps) {
  const [session, setSession] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        const response = await fetch(`/api/learning/lessons/${lessonId}/live-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseSlug }),
        });
        const data = (await response.json()) as { error?: string; token?: string; url?: string };

        if (cancelled) return;

        if (!response.ok || !data.token || !data.url) {
          setError(data.error ?? "라이브 수업에 연결할 수 없습니다.");
          return;
        }

        setSession({ token: data.token, url: data.url });
      } catch {
        if (!cancelled) setError("네트워크 오류");
      }
    }

    connect();
    return () => {
      cancelled = true;
    };
  }, [courseSlug, lessonId]);

  if (error) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-center typo-subTypography11 text-[var(--color-text-secondary)]">
        {error}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-center typo-subTypography11 text-[var(--color-text-secondary)]">
        라이브 수업에 연결 중…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-zinc-950">
      <LiveKitRoom
        token={session.token}
        serverUrl={session.url}
        connect
        audio
        video={false}
        className="min-h-[360px]"
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
