"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PostMarkdown } from "@/components/community/post-markdown";
import type { LessonQnaQuestion, LessonQnaReply } from "@/lib/lesson-qna";
import { LESSON_QNA_IMAGE_LIMIT } from "@/lib/media/lesson-qna-limits";
import { formatPostRelativeTime } from "@/lib/post-content";

type LessonQnaPanelProps = {
  lessonId: string;
  initialQuestions: LessonQnaQuestion[];
};

type ThreadProps = {
  lessonId: string;
  question: LessonQnaQuestion;
  open: boolean;
  showContext?: boolean;
  onToggle: () => void;
  onChange: (question: LessonQnaQuestion) => void;
  onRemove: () => void;
};

async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? "요청에 실패했습니다.";
}

function imageCount(body: string) {
  return [...body.matchAll(/!\[[^\]]*\]\([^)\s]+\)/g)].length;
}

function editedLabel(editedAt: string | null) {
  return editedAt ? " · 수정됨" : "";
}

function sortQuestions(items: LessonQnaQuestion[]) {
  return [...items].sort(
    (a, b) => b.upvoteCount - a.upvoteCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function LessonQnaPanel({ lessonId, initialQuestions }: LessonQnaPanelProps) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const id = window.location.hash.replace(/^#qna-/, "");
    if (id && questions.some((question) => question.id === id)) {
      setOpenId(id);
    }
  }, [questions]);

  return (
    <section className="lesson-qna" aria-labelledby="lesson-qna-heading">
      <header className="lesson-qna__header">
        <h2 id="lesson-qna-heading" className="lesson-qna__title">
          Q&A
        </h2>
        <p className="lesson-qna__lede">
          같은 코스를 듣는 수강생과 강사에게 공개됩니다. 개인 사정은 코칭 Q&A에 남겨 주세요.
        </p>
      </header>

      <QuestionComposer
        lessonId={lessonId}
        onCreated={(question) => {
          setQuestions((current) =>
            sortQuestions([question, ...current.filter((item) => item.id !== question.id)]),
          );
          setOpenId(question.id);
        }}
      />

      {questions.length === 0 ? (
        <p className="lesson-qna__empty">아직 질문이 없습니다. 막힌 지점을 남겨 주세요.</p>
      ) : (
        <ul className="lesson-qna__list">
          {questions.map((question) => (
            <LessonQnaThread
              key={question.id}
              lessonId={lessonId}
              question={question}
              open={openId === question.id}
              onToggle={() => setOpenId((current) => (current === question.id ? null : question.id))}
              onChange={(next) =>
                setQuestions((current) =>
                  sortQuestions(current.map((item) => (item.id === next.id ? next : item))),
                )
              }
              onRemove={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function LessonQnaThread({
  lessonId,
  question,
  open,
  showContext = false,
  onToggle,
  onChange,
  onRemove,
}: ThreadProps) {
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(question.title);
  const [body, setBody] = useState(question.body);

  useEffect(() => {
    if (!open || !showContext) return;
    void fetch(`/api/coach/lesson-questions/${question.id}/read`, { method: "POST" });
  }, [open, showContext, question.id]);

  async function voteQuestion() {
    setError(null);
    const response = await fetch(
      `/api/learning/lessons/${lessonId}/questions/${question.id}/vote`,
      { method: "POST" },
    );
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const data = (await response.json()) as { question: LessonQnaQuestion };
    onChange(data.question);
  }

  async function saveQuestion() {
    setError(null);
    const response = await fetch(`/api/learning/lessons/${lessonId}/questions/${question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const data = (await response.json()) as { question: LessonQnaQuestion };
    onChange(data.question);
    setEditing(false);
  }

  async function removeQuestion() {
    if (!window.confirm("이 질문을 삭제할까요?")) return;
    setError(null);
    const response = await fetch(`/api/learning/lessons/${lessonId}/questions/${question.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    onRemove();
  }

  async function closeQuestion() {
    setError(null);
    const response = await fetch(`/api/learning/lessons/${lessonId}/questions/${question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isClosed: true }),
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const data = (await response.json()) as { question: LessonQnaQuestion };
    onChange(data.question);
  }

  return (
    <li id={`qna-${question.id}`} className="lesson-qna__item">
      <div className="lesson-qna__row">
        <button
          type="button"
          className={["lesson-qna__vote", question.viewerUpvoted ? "lesson-qna__vote--on" : ""]
            .filter(Boolean)
            .join(" ")}
          aria-pressed={question.viewerUpvoted}
          aria-label={`업보트 ${question.upvoteCount}`}
          onClick={voteQuestion}
        >
          <span aria-hidden="true">▲</span>
          {question.upvoteCount}
        </button>
        <button type="button" className="lesson-qna__summary" onClick={onToggle} aria-expanded={open}>
          {showContext ? (
            <span className="lesson-qna__context">
              {question.courseTitle} · {question.lessonTitle}
            </span>
          ) : null}
          <span className="lesson-qna__question-title">{question.title}</span>
          <span className="lesson-qna__meta">
            {question.author.name}
            {question.author.isInstructor ? " · 강사" : ""}
            {" · "}
            {formatPostRelativeTime(new Date(question.createdAt))}
            {editedLabel(question.editedAt)}
            {" · 답변 "}
            {question.replyCount}
            {question.isClosed ? " · 닫힘" : ""}
          </span>
        </button>
      </div>

      {open ? (
        <div className="lesson-qna__thread">
          {editing ? (
            <div className="lesson-qna__form">
              <input
                className="lesson-qna__input"
                value={title}
                maxLength={120}
                onChange={(event) => setTitle(event.target.value)}
                aria-label="제목"
              />
              <BodyField lessonId={lessonId} body={body} onChange={setBody} />
              <div className="lesson-qna__actions">
                <button type="button" className="lesson-qna__btn" onClick={saveQuestion}>
                  저장
                </button>
                <button type="button" className="lesson-qna__btn lesson-qna__btn--ghost" onClick={() => setEditing(false)}>
                  취소
                </button>
              </div>
            </div>
          ) : (
            <>
              {question.body ? <PostMarkdown content={question.body} className="lesson-qna__body" /> : null}
              {showContext ? (
                <p className="lesson-qna__note">
                  <Link href={`/learning/${question.courseId}/lessons/${question.lessonId}#qna-${question.id}`}>
                    레슨에서 보기
                  </Link>
                </p>
              ) : null}
              <div className="lesson-qna__actions">
                {question.canEdit ? (
                  <button type="button" className="lesson-qna__btn lesson-qna__btn--ghost" onClick={() => setEditing(true)}>
                    수정
                  </button>
                ) : null}
                {question.canDelete ? (
                  <button type="button" className="lesson-qna__btn lesson-qna__btn--ghost" onClick={removeQuestion}>
                    삭제
                  </button>
                ) : null}
                {question.canModerate && !question.isClosed ? (
                  <button type="button" className="lesson-qna__btn lesson-qna__btn--ghost" onClick={closeQuestion}>
                    질문 닫기
                  </button>
                ) : null}
              </div>
            </>
          )}

          <ul className="lesson-qna__replies">
            {question.replies.map((reply) => (
              <ReplyRow
                key={reply.id}
                lessonId={lessonId}
                question={question}
                reply={reply}
                onChange={onChange}
              />
            ))}
          </ul>

          {question.isClosed ? (
            <p className="lesson-qna__note">닫힌 질문입니다. 새 답변을 달 수 없습니다.</p>
          ) : (
            <ReplyComposer lessonId={lessonId} questionId={question.id} onChange={onChange} />
          )}
          {error ? <p className="lesson-qna__error">{error}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

function ReplyRow({
  lessonId,
  question,
  reply,
  onChange,
}: {
  lessonId: string;
  question: LessonQnaQuestion;
  reply: LessonQnaReply;
  onChange: (question: LessonQnaQuestion) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(reply.body);
  const [error, setError] = useState<string | null>(null);

  async function vote() {
    setError(null);
    const response = await fetch(
      `/api/learning/lessons/${lessonId}/questions/${question.id}/replies/${reply.id}/vote`,
      { method: "POST" },
    );
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const data = (await response.json()) as { question: LessonQnaQuestion };
    onChange(data.question);
  }

  async function save() {
    setError(null);
    const response = await fetch(
      `/api/learning/lessons/${lessonId}/questions/${question.id}/replies/${reply.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      },
    );
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const data = (await response.json()) as { reply: LessonQnaReply };
    onChange({
      ...question,
      replies: question.replies.map((item) => (item.id === reply.id ? data.reply : item)),
    });
    setEditing(false);
  }

  async function remove() {
    if (!window.confirm("이 답변을 삭제할까요?")) return;
    setError(null);
    const response = await fetch(
      `/api/learning/lessons/${lessonId}/questions/${question.id}/replies/${reply.id}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    onChange({
      ...question,
      replyCount: Math.max(0, question.replyCount - 1),
      replies: question.replies.filter((item) => item.id !== reply.id),
    });
  }

  async function accept() {
    setError(null);
    const response = await fetch(
      `/api/learning/lessons/${lessonId}/questions/${question.id}/accept`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId: reply.id }),
      },
    );
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const data = (await response.json()) as { question: LessonQnaQuestion };
    onChange(data.question);
  }

  return (
    <li className={["lesson-qna__reply", reply.isAccepted ? "lesson-qna__reply--accepted" : ""].filter(Boolean).join(" ")}>
      <div className="lesson-qna__row">
        <button
          type="button"
          className={["lesson-qna__vote", reply.viewerUpvoted ? "lesson-qna__vote--on" : ""].filter(Boolean).join(" ")}
          aria-pressed={reply.viewerUpvoted}
          aria-label={`업보트 ${reply.upvoteCount}`}
          onClick={vote}
        >
          <span aria-hidden="true">▲</span>
          {reply.upvoteCount}
        </button>
        <div className="lesson-qna__reply-main">
          <p className="lesson-qna__meta">
            {reply.isAccepted ? "채택된 답변 · " : ""}
            {reply.author.name}
            {reply.author.isInstructor ? " · 강사" : ""}
            {" · "}
            {formatPostRelativeTime(new Date(reply.createdAt))}
            {editedLabel(reply.editedAt)}
          </p>
          {editing ? (
            <div className="lesson-qna__form">
              <BodyField lessonId={lessonId} body={body} onChange={setBody} />
              <div className="lesson-qna__actions">
                <button type="button" className="lesson-qna__btn" onClick={save} disabled={!body.trim()}>
                  저장
                </button>
                <button type="button" className="lesson-qna__btn lesson-qna__btn--ghost" onClick={() => setEditing(false)}>
                  취소
                </button>
              </div>
            </div>
          ) : (
            <PostMarkdown content={reply.body} className="lesson-qna__body" />
          )}
          <div className="lesson-qna__actions">
            {reply.canEdit && !editing ? (
              <button type="button" className="lesson-qna__btn lesson-qna__btn--ghost" onClick={() => setEditing(true)}>
                수정
              </button>
            ) : null}
            {reply.canDelete ? (
              <button type="button" className="lesson-qna__btn lesson-qna__btn--ghost" onClick={remove}>
                삭제
              </button>
            ) : null}
            {question.canModerate ? (
              <button type="button" className="lesson-qna__btn lesson-qna__btn--ghost" onClick={accept}>
                {reply.isAccepted ? "채택 해제" : "채택"}
              </button>
            ) : null}
          </div>
          {error ? <p className="lesson-qna__error">{error}</p> : null}
        </div>
      </div>
    </li>
  );
}

function QuestionComposer({
  lessonId,
  onCreated,
}: {
  lessonId: string;
  onCreated: (question: LessonQnaQuestion) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/learning/lessons/${lessonId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      const data = (await response.json()) as { question: LessonQnaQuestion };
      setTitle("");
      setBody("");
      onCreated(data.question);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="lesson-qna__form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label className="lesson-qna__label">
        제목
        <input
          className="lesson-qna__input"
          value={title}
          maxLength={120}
          required
          placeholder="무엇을 알고 싶나요?"
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <div className="lesson-qna__label">
        설명
        <BodyField lessonId={lessonId} body={body} onChange={setBody} />
      </div>
      <p className="lesson-qna__note">영상 시점은 설명에 분·초로 적고, 동작은 이미지로 넣으면 강사가 답하기 쉽습니다.</p>
      {error ? <p className="lesson-qna__error">{error}</p> : null}
      <button type="submit" className="lesson-qna__btn" disabled={busy || !title.trim()}>
        {busy ? "등록 중…" : "질문 등록"}
      </button>
    </form>
  );
}

function ReplyComposer({
  lessonId,
  questionId,
  onChange,
}: {
  lessonId: string;
  questionId: string;
  onChange: (question: LessonQnaQuestion) => void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/learning/lessons/${lessonId}/questions/${questionId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      const listed = await fetch(`/api/learning/lessons/${lessonId}/questions`);
      if (!listed.ok) {
        setError(await readError(listed));
        return;
      }
      const data = (await listed.json()) as { questions: LessonQnaQuestion[] };
      const next = data.questions.find((item) => item.id === questionId);
      if (next) onChange(next);
      setBody("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="lesson-qna__form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="lesson-qna__label">
        답변
        <BodyField lessonId={lessonId} body={body} onChange={setBody} />
      </div>
      {error ? <p className="lesson-qna__error">{error}</p> : null}
      <button type="submit" className="lesson-qna__btn" disabled={busy || !body.trim()}>
        {busy ? "등록 중…" : "답변 등록"}
      </button>
    </form>
  );
}

function BodyField({
  lessonId,
  body,
  onChange,
}: {
  lessonId: string;
  body: string;
  onChange: (value: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function addImage(file: File) {
    if (imageCount(body) >= LESSON_QNA_IMAGE_LIMIT) {
      setError(`이미지는 ${LESSON_QNA_IMAGE_LIMIT}장까지 넣을 수 있습니다.`);
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    const response = await fetch(`/api/learning/lessons/${lessonId}/questions/media`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const data = (await response.json()) as { publicUrl: string };
    const snippet = `\n\n![이미지](${data.publicUrl})\n`;
    onChange(`${body.trim()}${snippet}`);
  }

  return (
    <div className="lesson-qna__body-field">
      <textarea
        className="lesson-qna__textarea"
        value={body}
        maxLength={4000}
        rows={4}
        placeholder="설명 (선택). 예: 3:42 무릎 방향이 맞나요?"
        onChange={(event) => onChange(event.target.value)}
      />
      <label className="lesson-qna__file">
        이미지 넣기
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void addImage(file);
          }}
        />
      </label>
      {error ? <p className="lesson-qna__error">{error}</p> : null}
    </div>
  );
}
