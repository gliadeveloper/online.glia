"use client";

import { toYoutubeEmbedUrl } from "@/lib/media/youtube";

type LessonVideoPlayerProps = {
  url: string;
  title?: string | null;
};

export function LessonVideoPlayer({ url, title }: LessonVideoPlayerProps) {
  const youtubeEmbed = toYoutubeEmbedUrl(url);

  if (!youtubeEmbed) {
    return (
      <div className="lesson-video-player__placeholder">
        YouTube URL을 확인할 수 없습니다.
      </div>
    );
  }

  return (
    <div className="lesson-video-player">
      <iframe
        src={youtubeEmbed}
        title={title ?? "Video"}
        className="lesson-video-player__iframe"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
