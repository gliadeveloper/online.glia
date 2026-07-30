"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Message = {
  id: string;
  authorRole: "STUDENT" | "COACH";
  authorName: string;
  bodyMarkdown: string;
  awaitingReply: boolean;
  createdAt: string;
};

type CoachingSessionQnaPanelProps = {
  sessionId: string;
  messages: Message[];
};

export function CoachingSessionQnaPanel({
  sessionId,
  messages: initialMessages,
}: CoachingSessionQnaPanelProps) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/coaching/sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyMarkdown: body }),
      });

      const data = (await response.json()) as Message & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "전송에 실패했습니다.");
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: data.id,
          authorRole: "STUDENT",
          authorName: "나",
          bodyMarkdown: body.trim(),
          awaitingReply: true,
          createdAt: new Date().toISOString(),
        },
      ]);
      setBody("");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-sm">
      {messages.length === 0 ? (
        <p className="typo-subTypography11 text-[var(--color-text-secondary)]">
          아직 질문이 없습니다. 궁금한 점을 남겨보세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`rounded-[var(--radius-md)] px-4 py-3 typo-subTypography11 ${
                message.authorRole === "COACH"
                  ? "bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]"
                  : "border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">
                  {message.authorRole === "COACH" ? "코치" : "나"} · {message.authorName}
                </p>
                <time className="typo-subTypography12 text-[var(--color-text-secondary)]">
                  {new Date(message.createdAt).toLocaleString("ko-KR")}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap">{message.bodyMarkdown}</p>
              {message.awaitingReply && message.authorRole === "STUDENT" && (
                <p className="mt-2 typo-subTypography12 text-amber-700 dark:text-amber-300">답변 대기 중</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 border-t border-[var(--color-border)] pt-4">
        <label className="block typo-subTypography11 font-medium text-[var(--color-text-primary)]">
          질문 남기기
        </label>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          placeholder="코칭 내용에 대해 질문을 남겨주세요."
          className="shell-focus-ring w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 typo-subTypography11 text-[var(--color-text-primary)]"
        />
        <button
          type="submit"
          disabled={loading || !body.trim()}
          className="shell-focus-ring inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 py-2 typo-subTypography11 font-medium text-white hover:bg-[var(--color-action-primary-hover)] disabled:opacity-60"
        >
          {loading ? "전송 중..." : "질문 보내기"}
        </button>
        {error && <p className="typo-subTypography11 text-red-600">{error}</p>}
      </form>
    </div>
  );
}
