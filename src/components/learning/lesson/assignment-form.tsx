"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { submissionStatusLabels } from "@/lib/customer-labels";
import type { SubmissionStatus } from "@/generated/prisma/client";

type AssignmentFormProps = {
  assignmentId: string;
  courseSlug: string;
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
  courseSlug,
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
        body: JSON.stringify({ courseSlug, content }),
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
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-sm">
      <h2 className="typo-subTypography9 font-semibold text-[var(--color-text-primary)]">{title}</h2>
      {description && (
        <p className="mt-2 typo-subTypography11 text-[var(--color-text-secondary)]">{description}</p>
      )}
      <p className="mt-2 typo-subTypography12 text-[var(--color-text-secondary)]">
        만점 {maxScore}점
        {dueDate ? ` · 마감 ${new Date(dueDate).toLocaleDateString("ko-KR")}` : ""}
      </p>

      {existing && (
        <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] px-4 py-3 typo-subTypography11">
          <p className="font-medium text-[var(--color-text-primary)]">
            {submissionStatusLabels[existing.status]}
          </p>
          {existing.score != null && (
            <p className="mt-1 text-[var(--color-text-secondary)]">점수 {existing.score}점</p>
          )}
          {existing.feedback && (
            <p className="mt-2 text-[var(--color-text-secondary)]">피드백: {existing.feedback}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block space-y-2 typo-subTypography11">
          <span className="font-medium text-[var(--color-text-primary)]">제출 내용</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={8}
            required
            disabled={submitted && existing?.status === "GRADED"}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] shell-focus-ring"
            placeholder="과제 내용, GitHub 링크, 구현 설명 등을 작성하세요."
          />
        </label>
        {error && (
          <p role="alert" className="rounded-[var(--radius-md)] bg-red-50 px-3 py-2 typo-subTypography11 text-red-800">
            {error}
          </p>
        )}
        {(!submitted || existing?.status === "RETURNED") && (
          <button
            type="submit"
            disabled={busy}
            className="shell-focus-ring min-h-11 rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 py-2.5 typo-subTypography11 font-medium text-white hover:bg-[var(--color-action-primary-hover)] disabled:opacity-60"
          >
            {busy ? "제출 중..." : submitted ? "다시 제출" : "과제 제출"}
          </button>
        )}
        {submitted && existing?.status !== "RETURNED" && (
          <p role="status" className="typo-subTypography11 text-emerald-800">
            제출이 완료되었습니다.
          </p>
        )}
      </form>
    </section>
  );
}
