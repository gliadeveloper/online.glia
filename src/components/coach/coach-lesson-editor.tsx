"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { mediaBodyVersion } from "@/lib/media/body-version";
import { LessonMarkdownEditor } from "@/components/learning/lesson/lesson-markdown-editor";
import { lessonSupportsMarkdownEditor } from "@/lib/lesson-markdown-content";
import { getLessonYoutubeUrl, isYoutubeUrl } from "@/lib/media/youtube";
import { isZoomUrl } from "@/lib/media/zoom";

function findZoomContent(contents: ContentRow[]) {
  return (
    contents.find((content) => isZoomUrl(content.url)) ??
    contents.find((content) => content.type === "LINK") ??
    null
  );
}

function findVideoContent(contents: ContentRow[]) {
  return contents.find((content) => content.type === "VIDEO") ?? null;
}

type ContentRow = {
  id: string;
  type: string;
  title: string | null;
  url: string | null;
  body: string | null;
  metadata: unknown;
};

type CoachLessonEditorProps = {
  lessonId: string;
  courseId: string;
  lessonType: string;
  lessonTitle: string;
  contents: ContentRow[];
  courseTitle: string;
  scheduledStartAt?: string;
  supplies?: string;
};

export function CoachLessonEditor({
  lessonId,
  courseId,
  lessonType,
  lessonTitle,
  contents,
  courseTitle,
  scheduledStartAt = "",
  supplies = "",
}: CoachLessonEditorProps) {
  const router = useRouter();
  const zoomContent = findZoomContent(contents);
  const videoContent = findVideoContent(contents);
  const savedContent = useRef({ video: videoContent, zoom: zoomContent });
  const [zoomUrl, setZoomUrl] = useState(zoomContent?.url?.trim() ?? "");
  const [startsAt, setStartsAt] = useState(scheduledStartAt);
  const [supplyText, setSupplyText] = useState(supplies);
  const [youtubeUrl, setYoutubeUrl] = useState(getLessonYoutubeUrl(contents) ?? videoContent?.url?.trim() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveYoutubeVideo(event: React.FormEvent) {
    event.preventDefault();

    const trimmedUrl = youtubeUrl.trim();
    if (!trimmedUrl) {
      setError("YouTube URL을 입력하세요.");
      return;
    }
    if (!isYoutubeUrl(trimmedUrl)) {
      setError("YouTube 동영상 URL을 입력하세요.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const existing = savedContent.current.video;
      const url = existing
        ? `/api/coach/contents/${existing.id}`
        : `/api/coach/lessons/${lessonId}/contents`;
      const method = existing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedBodyVersion: existing ? await mediaBodyVersion(existing) : undefined,
          type: "VIDEO",
          title: "YouTube",
          url: trimmedUrl,
          metadata: null,
        }),
      });

      const data = (await response.json()) as ContentRow & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "YouTube URL 저장에 실패했습니다.");
        return;
      }

      savedContent.current.video = data;
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  async function saveZoomLink(event: React.FormEvent) {
    event.preventDefault();

    const trimmedZoom = zoomUrl.trim();
    if (!trimmedZoom) {
      setError("Zoom 회의 URL을 입력하세요.");
      return;
    }
    if (!isZoomUrl(trimmedZoom)) {
      setError("Zoom 회의 URL(zoom.us)을 입력하세요.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startsAt)) {
      setError("수업 시작 시각을 입력하세요.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const existing = savedContent.current.zoom;
      const url = existing
        ? `/api/coach/contents/${existing.id}`
        : `/api/coach/lessons/${lessonId}/contents`;
      const method = existing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedBodyVersion: existing ? await mediaBodyVersion(existing) : undefined,
          type: "LINK",
          title: "Zoom",
          url: trimmedZoom,
          scheduledStartAt: startsAt,
          supplies: supplyText,
        }),
      });

      const data = (await response.json()) as ContentRow & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Zoom 링크 저장에 실패했습니다.");
        return;
      }

      savedContent.current.zoom = data;
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-zinc-500">{courseTitle}</p>
        <h1 className="text-2xl font-semibold text-zinc-900">{lessonTitle}</h1>
        <p className="mt-1 text-sm text-zinc-500">{lessonType}</p>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {lessonType === "VIDEO" && (
        <form
          onSubmit={saveYoutubeVideo}
          className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div>
            <h2 className="font-semibold text-zinc-900">YouTube 동영상</h2>
            <p className="mt-1 text-sm text-zinc-500">
              YouTube URL을 등록하면 수강생 화면에 임베드 플레이어로 표시됩니다.
            </p>
          </div>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">YouTube URL</span>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
              className="w-full rounded-xl border border-zinc-200 px-4 py-3"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            저장
          </button>
        </form>
      )}

      {lessonSupportsMarkdownEditor(lessonType) ? (
        <LessonMarkdownEditor
          lessonId={lessonId}
          courseId={courseId}
          contents={contents}
          apiRole="coach"
        />
      ) : null}

      {lessonType === "LIVE" && (
        <form
          onSubmit={saveZoomLink}
          className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div>
            <h2 className="font-semibold text-zinc-900">Zoom 링크</h2>
            <p className="mt-1 text-sm text-zinc-500">
              수강생은 이 링크로 라이브 수업에 참여합니다. 시작 시각은 한국 시간입니다. 저장하면
              하루 전, 1시간 전, 15분 전 알림이 예약되고, 이미 10분 안으로 들어온 알림은 건너뜁니다.
            </p>
          </div>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">수업 시작</span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
              className="w-full rounded-xl border border-zinc-200 px-4 py-3"
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">이 회차 준비물</span>
            <textarea
              value={supplyText}
              onChange={(event) => setSupplyText(event.target.value)}
              rows={4}
              placeholder={"줄마다 하나씩 입력\nZoom 앱\n이어폰"}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3"
            />
            <span className="block text-xs text-zinc-500">
              이 수업 알림톡의 준비물에만 들어갑니다. 상품 상세의 공통 준비물과는 따로입니다.
            </span>
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Zoom 회의 URL</span>
            <input
              type="url"
              value={zoomUrl}
              onChange={(event) => setZoomUrl(event.target.value)}
              placeholder="https://zoom.us/j/..."
              required
              className="w-full rounded-xl border border-zinc-200 px-4 py-3"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            저장
          </button>
        </form>
      )}
    </div>
  );
}
