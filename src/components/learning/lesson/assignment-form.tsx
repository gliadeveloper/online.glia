"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  TrustAlert,
  TrustButton,
  TrustField,
  TrustTextarea,
} from "@/components/corporate-trust/app-trust-ui";
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
    <section className="trust-card p-6">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
      <p className="mt-2 text-xs text-slate-500">
        만점 {maxScore}점
        {dueDate ? ` · 마감 ${new Date(dueDate).toLocaleDateString("ko-KR")}` : ""}
      </p>

      {existing && (
        <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <p className="font-semibold text-slate-900">{submissionStatusLabels[existing.status]}</p>
          {existing.score != null && (
            <p className="mt-1 text-slate-600">점수 {existing.score}점</p>
          )}
          {existing.feedback && <p className="mt-2 text-slate-600">피드백: {existing.feedback}</p>}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <TrustField label="제출 내용">
          <TrustTextarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={8}
            required
            disabled={submitted && existing?.status === "GRADED"}
            placeholder="과제 내용, GitHub 링크, 구현 설명 등을 작성하세요."
          />
        </TrustField>

        {error && <TrustAlert tone="error">{error}</TrustAlert>}

        {(!submitted || existing?.status === "RETURNED") && (
          <TrustButton type="submit" variant="primary" disabled={busy}>
            {busy ? "제출 중..." : submitted ? "다시 제출" : "과제 제출"}
          </TrustButton>
        )}

        {submitted && existing?.status !== "RETURNED" && (
          <TrustAlert tone="success">제출이 완료되었습니다.</TrustAlert>
        )}
      </form>
    </section>
  );
}
