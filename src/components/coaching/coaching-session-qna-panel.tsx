"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { TrustButton, TrustTextarea } from "@/components/corporate-trust/app-trust-ui";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Typography } from "@/components/typography/typography";
import type { CoachProfile } from "@/lib/coaching-display";
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
    <div className="coaching-qna">
      {messages.length === 0 ? (
        <Typography as="p" role="bodySecondary" color="secondary" className="coaching-qna__empty">
          아직 질문이 없습니다. 궁금한 점을 남겨보세요.
        </Typography>
      ) : (
        <ul className="community-comment-list">
          {messages.map((message) => {
            const isCoach = message.authorRole === "COACH";

            return (
              <li key={message.id}>
                <article className="community-comment-item">
                  {isCoach ? (
                    <UserAvatar
                      name={coach.name}
                      email={coach.email}
                      avatarUrl={message.authorAvatarUrl ?? coach.profile?.avatarUrl}
                      size="sm"
                    />
                  ) : (
                    <UserAvatar name="나" email="student@local" size="sm" label="나" />
                  )}
                  <div className="community-comment-item__body">
                    <header className="community-comment-item__header">
                      <Typography as="p" role="bodyCompact" weight="semibold" color="primary">
                        {isCoach ? message.authorName : "나"}
                      </Typography>
                      <Typography as="p" role="caption" color="secondary">
                        <time dateTime={message.createdAt}>
                          {formatPostRelativeTime(new Date(message.createdAt))}
                        </time>
                      </Typography>
                    </header>

                    <Typography
                      as="p"
                      role="bodySecondary"
                      color="primary"
                      className="community-comment-item__text whitespace-pre-wrap"
                    >
                      {message.bodyMarkdown}
                    </Typography>

                    {message.awaitingReply && !isCoach && (
                      <Typography as="p" role="caption" color="secondary" className="coaching-qna__pending">
                        답변 대기 중
                      </Typography>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="community-comment-form coaching-qna__composer">
        <label htmlFor={`coaching-qna-${sessionId}`} className="sr-only">
          질문
        </label>
        <TrustTextarea
          id={`coaching-qna-${sessionId}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="코칭 내용에 대해 질문을 남겨주세요."
          rows={3}
          maxLength={2000}
          disabled={loading}
        />

        <div className="community-comment-form__footer">
          <Typography as="p" role="caption" color="secondary">
            {body.length.toLocaleString("ko-KR")} / 2,000
          </Typography>
          <TrustButton type="submit" variant="primary" disabled={loading || !body.trim()}>
            {loading ? "전송 중…" : "질문 등록"}
          </TrustButton>
        </div>

        {error && (
          <Typography as="p" role="bodySecondary" color="secondary" className="community-comment-form__error">
            {error}
          </Typography>
        )}
      </form>
    </div>
  );
}
