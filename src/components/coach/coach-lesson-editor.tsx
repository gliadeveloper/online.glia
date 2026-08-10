"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
};

export function CoachLessonEditor({
  lessonId,
  courseId,
  lessonType,
  lessonTitle,
  contents,
  courseTitle,
}: CoachLessonEditorProps) {
  const router = useRouter();
  const zoomContent = findZoomContent(contents);
  const videoContent = findVideoContent(contents);
  const [zoomUrl, setZoomUrl] = useState(zoomContent?.url?.trim() ?? "");
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
      const existing = findVideoContent(contents);
      const url = existing
        ? `/api/coach/contents/${existing.id}`
        : `/api/coach/lessons/${lessonId}/contents`;
      const method = existing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "VIDEO",
          title: "YouTube",
          url: trimmedUrl,
          metadata: null,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "YouTube URL 저장에 실패했습니다.");
        return;
      }

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

    setBusy(true);
    setError(null);

    try {
      const existing = findZoomContent(contents);
      const url = existing
        ? `/api/coach/contents/${existing.id}`
        : `/api/coach/lessons/${lessonId}/contents`;
      const method = existing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "LINK",
          title: "Zoom",
          url: trimmedZoom,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Zoom 링크 저장에 실패했습니다.");
        return;
      }

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
              수강생은 이 링크로 라이브 수업에 참여합니다. 종료 후 다시보기는 LIVE 레슨을 삭제하고
              VIDEO 레슨을 새로 만든 뒤 YouTube URL을 등록하세요.
            </p>
          </div>
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
