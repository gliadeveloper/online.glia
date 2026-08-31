"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatPostRelativeTime } from "@/lib/post-content";

type Message = {
  id: string;
  authorRole: "STUDENT" | "COACH";
  authorName: string;
  bodyMarkdown: string;
  awaitingReply: boolean;
  createdAt: string;
};

type CoachSessionQnaPanelProps = {
  sessionId: string;
  studentName: string;
  published: boolean;
  messages: Message[];
};

export function CoachSessionQnaPanel({
  sessionId,
  studentName,
  published,
  messages: initialMessages,
}: CoachSessionQnaPanelProps) {
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

      const data = (await response.json()) as {
        id?: string;
        authorRole?: "STUDENT" | "COACH";
        author?: { name?: string | null; email?: string };
        awaitingReply?: boolean;
        createdAt?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "전송에 실패했습니다.");
        return;
      }

      const text = body.trim();
      setMessages((current) => [
        ...current.map((message) =>
          message.authorRole === "STUDENT" && message.awaitingReply
            ? { ...message, awaitingReply: false }
            : message,
        ),
        {
          id: data.id ?? `local-${Date.now()}`,
          authorRole: "COACH",
          authorName: data.author?.name ?? data.author?.email ?? "나",
          bodyMarkdown: text,
          awaitingReply: false,
          createdAt: data.createdAt ?? new Date().toISOString(),
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
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="font-semibold text-zinc-900">Q&A</h2>
        <p className="mt-1 text-sm text-zinc-600">
          회원이 남긴 질문에 답하면 회원 회차 화면에 표시됩니다.
        </p>
      </div>

      {messages.length === 0 ? (
        <p className="text-sm text-zinc-500">아직 질문이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
          {messages.map((message) => {
            const isCoach = message.authorRole === "COACH";
            return (
              <li key={message.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900">
                    {isCoach ? "코치" : studentName}
                    {isCoach ? (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        나
                      </span>
                    ) : null}
                    {message.awaitingReply && !isCoach ? (
                      <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        답변 대기
                      </span>
                    ) : null}
                  </p>
                  <time className="text-xs text-zinc-400" dateTime={message.createdAt}>
                    {formatPostRelativeTime(new Date(message.createdAt))}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{message.bodyMarkdown}</p>
              </li>
            );
          })}
        </ul>
      )}

      {published ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block space-y-2 text-sm">
            <span className="sr-only">답변</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={`${studentName} 님 질문에 답변을 남겨주세요.`}
              rows={3}
              maxLength={2000}
              disabled={loading}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3"
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={loading || !body.trim()}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "전송 중…" : "답변 등록"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-zinc-500">회차를 발행한 뒤에 Q&A에 답변할 수 있습니다.</p>
      )}
    </section>
  );
}
