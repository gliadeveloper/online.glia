"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { PostMarkdown } from "@/components/community/post-markdown";
import { CoachLiveStudio } from "@/components/coach/coach-live-room";
import { isLiveKitMetadata, parseContentMetadata } from "@/lib/media/content-metadata";
import { formatScheduledLabel } from "@/lib/live-session";

function toDatetimeLocalValue(iso: string | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getInitialLiveSchedule(contents: ContentRow[]) {
  for (const content of contents) {
    const metadata = parseContentMetadata(content.metadata as never);
    if (isLiveKitMetadata(metadata) && metadata.scheduledAt) {
      return {
        scheduledAt: toDatetimeLocalValue(metadata.scheduledAt),
        sessionStatus: metadata.sessionStatus ?? "SCHEDULED",
        scheduledLabel: formatScheduledLabel(metadata.scheduledAt),
      };
    }
  }
  return { scheduledAt: "", sessionStatus: "SCHEDULED" as const, scheduledLabel: null };
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveInitial = getInitialLiveSchedule(contents);
  const [markdown, setMarkdown] = useState(contents.find((c) => c.body)?.body ?? "");
  const [scheduledAt, setScheduledAt] = useState(liveInitial.scheduledAt);
  const [liveSessionStatus, setLiveSessionStatus] = useState(liveInitial.sessionStatus);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const videoContent = contents.find((c) => c.type === "VIDEO");

  async function saveTextContent(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const existing = contents.find((c) => c.type === "HTML" || c.body);
      const url = existing
        ? `/api/coach/contents/${existing.id}`
        : `/api/coach/lessons/${lessonId}/contents`;
      const method = existing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "HTML",
          title: "본문",
          body: markdown,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  async function handleVideoUpload(file: File) {
    setBusy(true);
    setError(null);
    setUploadProgress("업로드 URL 생성 중…");

    try {
      const presignResponse = await fetch("/api/coach/media/presign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          lessonId,
          fileName: file.name,
          contentType: file.type || "video/mp4",
        }),
      });

      const presignData = (await presignResponse.json()) as {
        error?: string;
        uploadUrl?: string;
        metadata?: Record<string, unknown>;
      };

      if (!presignResponse.ok || !presignData.uploadUrl || !presignData.metadata) {
        setError(presignData.error ?? "업로드 준비에 실패했습니다.");
        return;
      }

      setUploadProgress("R2에 업로드 중…");

      const uploadResponse = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "video/mp4" },
        body: file,
      });

      if (!uploadResponse.ok) {
        setError("파일 업로드에 실패했습니다.");
        return;
      }

      setUploadProgress("콘텐츠 저장 중…");

      const contentUrl = videoContent
        ? `/api/coach/contents/${videoContent.id}`
        : `/api/coach/lessons/${lessonId}/contents`;
      const contentMethod = videoContent ? "PATCH" : "POST";

      const saveResponse = await fetch(contentUrl, {
        method: contentMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "VIDEO",
          title: file.name,
          metadata: {
            ...presignData.metadata,
            sizeBytes: file.size,
          },
        }),
      });

      const saveData = (await saveResponse.json()) as { error?: string };
      if (!saveResponse.ok) {
        setError(saveData.error ?? "콘텐츠 저장에 실패했습니다.");
        return;
      }

      setUploadProgress(null);
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  }

  async function setupLiveSession(event: React.FormEvent) {
    event.preventDefault();
    if (!scheduledAt.trim()) {
      setError("라이브 시작 일시를 입력하세요.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const roomName = `lesson-${lessonId}`;
      const existing = contents[0];
      const existingMeta = existing
        ? parseContentMetadata(existing.metadata as never)
        : null;
      const preservedStatus =
        isLiveKitMetadata(existingMeta) ? existingMeta.sessionStatus : "SCHEDULED";
      const preservedStartedAt =
        isLiveKitMetadata(existingMeta) ? existingMeta.startedAt : undefined;

      const url = existing
        ? `/api/coach/contents/${existing.id}`
        : `/api/coach/lessons/${lessonId}/contents`;
      const method = existing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "LINK",
          title: "LiveKit 세션",
          metadata: {
            provider: "livekit",
            roomName,
            scheduledAt: new Date(scheduledAt).toISOString(),
            sessionStatus: preservedStatus ?? "SCHEDULED",
            startedAt: preservedStartedAt,
          },
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "라이브 설정에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  async function endLiveSession() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/coach/live/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(data.error ?? "라이브 종료에 실패했습니다.");
        return;
      }
      router.push("/coach/live");
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
      {uploadProgress && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{uploadProgress}</p>
      )}

      {lessonType === "VIDEO" && (
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-semibold text-zinc-900">동영상 (R2)</h2>
            <p className="mt-1 text-sm text-zinc-500">
              MP4 등 동영상 파일을 업로드하면 수강생에게 스트리밍됩니다.
            </p>
          </div>

          {videoContent && (
            <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              등록됨: {videoContent.title ?? videoContent.id}
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleVideoUpload(file);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {videoContent ? "동영상 교체" : "동영상 업로드"}
          </button>
        </section>
      )}

      {lessonType === "TEXT" && (
        <form
          onSubmit={saveTextContent}
          className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <h2 className="font-semibold text-zinc-900">마크다운 본문</h2>
          <textarea
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            rows={16}
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 font-mono text-sm"
            placeholder="# 레슨 제목&#10;&#10;본문을 마크다운으로 작성하세요."
          />
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">미리보기</p>
            <PostMarkdown content={markdown || "_미리볼 내용이 없습니다._"} />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            저장
          </button>
        </form>
      )}

      {lessonType === "LIVE" && (
        <div className="space-y-4">
          <form
            onSubmit={setupLiveSession}
            className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div>
              <h2 className="font-semibold text-zinc-900">라이브 일정</h2>
              <p className="mt-1 text-sm text-zinc-500">
                수강생에게 라이브 시작 시각과 남은 시간이 표시됩니다.
              </p>
            </div>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">시작 일시</span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                required
                className="w-full rounded-xl border border-zinc-200 px-4 py-3"
              />
            </label>
            {liveInitial.scheduledLabel && (
              <p className="text-sm text-zinc-600">
                현재 일정: {liveInitial.scheduledLabel}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              일정 저장
            </button>
          </form>

          {contents.length > 0 && scheduledAt && (
            <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-zinc-900">라이브 스튜디오</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {liveSessionStatus === "LIVE"
                      ? "수업 진행 중 — 수강생이 입장할 수 있습니다."
                      : liveSessionStatus === "ENDED"
                        ? "종료된 라이브입니다."
                        : "스튜디오 입장 시 라이브가 시작됩니다."}
                  </p>
                </div>
                {liveSessionStatus === "LIVE" && (
                  <button
                    type="button"
                    onClick={endLiveSession}
                    disabled={busy}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    종료 · 다시보기 생성
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                라이브 허브:{" "}
                <a href="/coach/live" className="font-medium text-emerald-700 hover:underline">
                  /coach/live
                </a>
              </p>
              {liveSessionStatus !== "ENDED" && (
                <CoachLiveStudio
                  lessonId={lessonId}
                  onStarted={() => setLiveSessionStatus("LIVE")}
                />
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
