"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useState } from "react";

type CoachLiveStudioProps = {
  lessonId: string;
  onStarted?: () => void;
  tokenEndpoint?: string;
};

export function CoachLiveStudio({
  lessonId,
  onStarted,
  tokenEndpoint = `/api/coach/lessons/${lessonId}/live-token`,
}: CoachLiveStudioProps) {
  const [session, setSession] = useState<{ token: string; url: string; roomName: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function joinStudio() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(tokenEndpoint, {
        method: "POST",
      });
      const data = (await response.json()) as {
        error?: string;
        token?: string;
        url?: string;
        roomName?: string;
      };

      if (!response.ok || !data.token || !data.url) {
        setError(data.error ?? "LiveKit 연결에 실패했습니다.");
        return;
      }

      setSession({ token: data.token, url: data.url, roomName: data.roomName ?? "" });
      onStarted?.();
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  if (session) {
    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950">
        <LiveKitRoom
          token={session.token}
          serverUrl={session.url}
          connect
          audio
          video
          className="min-h-[420px]"
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
      <p className="text-sm text-zinc-600">입장하면 라이브가 시작되고 수강생이 들어올 수 있습니다.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={joinStudio}
        disabled={loading}
        className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "시작 중…" : "라이브 시작"}
      </button>
    </div>
  );
}
