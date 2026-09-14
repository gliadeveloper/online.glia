"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  COACHING_LOG_MAX_LENGTH,
  COACHING_LOG_MAX_PER_SESSION,
} from "@/lib/coaching-session-log-limits";
import { formatPostRelativeTime } from "@/lib/post-content";

export type CoachingLogItem = {
  id: string;
  body: string;
  createdAt: string;
};

type CoachingSessionLogPanelProps = {
  sessionId: string;
  logs: CoachingLogItem[];
};

export function CoachingSessionLogPanel({
  sessionId,
  logs: initialLogs,
}: CoachingSessionLogPanelProps) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const remaining = COACHING_LOG_MAX_LENGTH - body.length;
  const atLimit = logs.length >= COACHING_LOG_MAX_PER_SESSION;
  const previewCount = 5;
  const visibleLogs = expanded || logs.length <= previewCount ? logs : logs.slice(0, previewCount);
  const hiddenCount = logs.length - visibleLogs.length;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || atLimit) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/coaching/sessions/${sessionId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await response.json()) as CoachingLogItem & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      setLogs((current) => [
        {
          id: data.id,
          body: data.body,
          createdAt: data.createdAt,
        },
        ...current,
      ]);
      setBody("");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(logId: string) {
    setDeletingId(logId);
    setError(null);
    try {
      const response = await fetch(`/api/coaching/sessions/${sessionId}/logs/${logId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "삭제에 실패했습니다.");
        return;
      }
      setLogs((current) => current.filter((log) => log.id !== logId));
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="glia-session__log-panel">
      <div className="glia-session__log-write">
        <p className="glia-session__section-lede">
          과제를 마친 뒤 오늘의 느낌을 한 줄로 남겨 보세요. 코치가 읽어 봅니다. 답변은 오지 않아요.
        </p>

        {atLimit ? (
          <p className="glia-session__empty">이 회차 기록을 모두 남겼습니다.</p>
        ) : (
          <form onSubmit={handleSubmit} className="glia-session__log-form">
            <div className="glia-session__composer">
              <label htmlFor={`coaching-log-${sessionId}`} className="sr-only">
                한줄 기록
              </label>
              <input
                id={`coaching-log-${sessionId}`}
                type="text"
                className="glia-session__composer-input"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="오늘 과제를 하고 난 뒤, 한 줄로"
                maxLength={COACHING_LOG_MAX_LENGTH}
                autoComplete="off"
                disabled={loading}
              />
              <button
                type="submit"
                className="glia-session__composer-send"
                disabled={loading || !body.trim()}
                aria-label="한줄 기록 남기기"
              >
                {loading ? "저장 중…" : "남기기"}
              </button>
            </div>
            <p className="glia-session__log-meter" aria-live="polite">
              {remaining}자 남음
            </p>
          </form>
        )}
      </div>

      {error ? (
        <p role="alert" className="glia-session__error">
          {error}
        </p>
      ) : null}

      {logs.length > 0 ? (
        <>
          <ol className="glia-session__log">
            {visibleLogs.map((log) => (
              <li key={log.id} className="glia-session__log-item">
                <time className="glia-session__log-time" dateTime={log.createdAt}>
                  {formatPostRelativeTime(new Date(log.createdAt))}
                </time>
                <p className="glia-session__log-body">{log.body}</p>
                <button
                  type="button"
                  className="glia-session__log-delete"
                  onClick={() => handleDelete(log.id)}
                  disabled={deletingId === log.id}
                  aria-label="이 기록 삭제"
                >
                  {deletingId === log.id ? "삭제 중…" : "삭제"}
                </button>
              </li>
            ))}
          </ol>
          {hiddenCount > 0 ? (
            <button
              type="button"
              className="glia-session__log-more"
              onClick={() => setExpanded(true)}
            >
              이전 기록 {hiddenCount.toLocaleString("ko-KR")}개 더 보기
            </button>
          ) : logs.length > previewCount ? (
            <button
              type="button"
              className="glia-session__log-more"
              onClick={() => setExpanded(false)}
            >
              최근 기록만 보기
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
