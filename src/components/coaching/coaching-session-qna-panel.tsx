"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CoachProfile } from "@/lib/coaching-display";
import { displayCoachName } from "@/lib/coaching-display";
import { formatPostRelativeTime } from "@/lib/post-content";

type Message = {
  id: string;
  authorRole: "STUDENT" | "COACH";
  authorName: string;
  authorAvatarUrl?: string | null;
  bodyMarkdown: string;
  awaitingReply: boolean;
  createdAt: string;
};

type CoachingSessionQnaPanelProps = {
  sessionId: string;
  coach: CoachProfile;
  messages: Message[];
};

function QnaAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  return (
    <span className="glia-session__avatar glia-session__avatar--sm" aria-hidden="true">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

export function CoachingSessionQnaPanel({
  sessionId,
  coach,
  messages: initialMessages,
}: CoachingSessionQnaPanelProps) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coachName = displayCoachName(coach);

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
    <>
      <form onSubmit={handleSubmit} className="glia-session__composer">
        <label htmlFor={`coaching-qna-${sessionId}`} className="sr-only">
          질문
        </label>
        <input
          id={`coaching-qna-${sessionId}`}
          type="text"
          className="glia-session__composer-input"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={`${coachName} 코치에게 질문을 남겨주세요.`}
          maxLength={2000}
          disabled={loading}
        />
        <button
          type="submit"
          className="glia-session__composer-send"
          disabled={loading || !body.trim()}
          aria-label="질문 등록"
        >
          {loading ? "전송 중…" : "등록"}
        </button>
      </form>
      {error ? (
        <p role="alert" className="glia-session__error">
          {error}
        </p>
      ) : null}

      {messages.length === 0 ? (
        <p className="glia-session__empty">아직 질문이 없습니다. 궁금한 점을 남겨보세요.</p>
      ) : (
        <ul className="glia-session__thread">
          {messages.map((message) => {
            const isCoach = message.authorRole === "COACH";
            const name = isCoach ? message.authorName : "나";

            return (
              <li key={message.id}>
                <article className="glia-session__message">
                  <QnaAvatar
                    name={name}
                    avatarUrl={
                      isCoach ? (message.authorAvatarUrl ?? coach.profile?.avatarUrl) : null
                    }
                  />
                  <div className="glia-session__message-body">
                    <header className="glia-session__message-head">
                      <p className="glia-session__message-author">
                        {name}
                        {isCoach ? (
                          <span className="glia-session__message-badge">코치</span>
                        ) : null}
                      </p>
                      <p className="glia-session__message-meta">
                        <time dateTime={message.createdAt}>
                          {formatPostRelativeTime(new Date(message.createdAt))}
                        </time>
                        {message.awaitingReply && !isCoach ? (
                          <span className="glia-session__message-wait">답변 대기</span>
                        ) : null}
                      </p>
                    </header>
                    <p className="glia-session__message-text">{message.bodyMarkdown}</p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
