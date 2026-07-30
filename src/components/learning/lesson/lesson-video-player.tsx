"use client";

import { useEffect, useState } from "react";

type LessonVideoPlayerProps = {
  lessonId: string;
  courseSlug: string;
  contentId: string;
  title?: string | null;
  fallbackUrl?: string | null;
};

export function LessonVideoPlayer({
  lessonId,
  courseSlug,
  contentId,
  title,
  fallbackUrl,
}: LessonVideoPlayerProps) {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(fallbackUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPlayback() {
      if (fallbackUrl) return;

      try {
        const params = new URLSearchParams({ contentId, courseSlug });
        const response = await fetch(
          `/api/learning/lessons/${lessonId}/playback?${params.toString()}`,
        );
        const data = (await response.json()) as { error?: string; playbackUrl?: string };

        if (cancelled) return;

        if (!response.ok || !data.playbackUrl) {
          setError(data.error ?? "동영상을 불러올 수 없습니다.");
          return;
        }

        setPlaybackUrl(data.playbackUrl);
      } catch {
        if (!cancelled) setError("네트워크 오류");
      }
    }

    loadPlayback();
    return () => {
      cancelled = true;
    };
  }, [contentId, courseSlug, fallbackUrl, lessonId]);

  if (error) {
    return (
      <div className="flex aspect-video items-center justify-center bg-zinc-900 p-6 text-center text-sm text-zinc-300">
        {error}
      </div>
    );
  }

  if (!playbackUrl) {
    return (
      <div className="flex aspect-video items-center justify-center bg-zinc-900 text-sm text-zinc-400">
        동영상 로딩 중…
      </div>
    );
  }

  const isExternalEmbed = playbackUrl.includes("youtube") || playbackUrl.includes("vimeo");

  if (isExternalEmbed) {
    return (
      <div className="aspect-video bg-zinc-950">
        <iframe src={playbackUrl} title={title ?? "Video"} className="h-full w-full" allowFullScreen />
      </div>
    );
  }

  return (
    <div className="aspect-video bg-zinc-950">
      <video
        src={playbackUrl}
        controls
        playsInline
        className="h-full w-full"
        title={title ?? "Video"}
      />
    </div>
  );
}
