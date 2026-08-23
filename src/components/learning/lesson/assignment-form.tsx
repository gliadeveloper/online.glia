"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { submissionStatusLabels } from "@/lib/customer-labels";
import type { SubmissionStatus } from "@/generated/prisma/client";

type AssignmentFormProps = {
  assignmentId: string;
  courseId: string;
  title: string;
  description: string | null;
  maxScore: number;
  dueDate: string | null;
  existing: {
    content: string | null;
    status: SubmissionStatus;
    score: number | null;
    feedback: string | null;
    submittedAt: string | null;
  } | null;
};

export function AssignmentForm({
  assignmentId,
  courseId,
  title,
  description,
  maxScore,
  dueDate,
  existing,
}: AssignmentFormProps) {
  const router = useRouter();
  const [content, setContent] = useState(existing?.content ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(Boolean(existing?.submittedAt));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/lms/assignments/${assignmentId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, content }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "제출에 실패했습니다.");
        return;
      }

      setSubmitted(true);
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="lesson-task">
      <h2 className="lesson-task__title">{title}</h2>
      {description ? <p className="lesson-task__desc">{description}</p> : null}
      <p className="lesson-task__meta">
        만점 {maxScore}점
        {dueDate ? ` · 마감 ${new Date(dueDate).toLocaleDateString("ko-KR")}` : ""}
      </p>

      {existing ? (
        <div className="lesson-task__status">
          <p className="lesson-task__status-title">{submissionStatusLabels[existing.status]}</p>
          {existing.score != null ? (
            <p className="lesson-task__status-body">점수 {existing.score}점</p>
          ) : null}
          {existing.feedback ? (
            <p className="lesson-task__status-body">피드백: {existing.feedback}</p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="lesson-task__form">
        <label className="lesson-task__field">
          <span className="lesson-task__label">제출 내용</span>
          <textarea
            className="lesson-task__textarea"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={8}
            required
            disabled={submitted && existing?.status === "GRADED"}
            placeholder="과제 내용, GitHub 링크, 구현 설명 등을 작성하세요."
          />
        </label>

        {error ? (
          <p className="lesson-task__alert lesson-task__alert--error" role="alert">
            {error}
          </p>
        ) : null}

        {!submitted || existing?.status === "RETURNED" ? (
          <button type="submit" className="lesson-task__btn" disabled={busy}>
            {busy ? "제출 중..." : submitted ? "다시 제출" : "과제 제출"}
          </button>
        ) : null}

        {submitted && existing?.status !== "RETURNED" ? (
          <p className="lesson-task__alert lesson-task__alert--success" role="status">
            제출이 완료되었습니다.
          </p>
        ) : null}
      </form>
    </section>
  );
}
