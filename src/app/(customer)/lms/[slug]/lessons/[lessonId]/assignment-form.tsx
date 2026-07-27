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
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-2 text-sm text-zinc-600">{description}</p>}
      <p className="mt-2 text-xs text-zinc-500">
        만점 {maxScore}점
        {dueDate ? ` · 마감 ${new Date(dueDate).toLocaleDateString("ko-KR")}` : ""}
      </p>

      {existing && (
        <div className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm">
          <p className="font-medium">{submissionStatusLabels[existing.status]}</p>
          {existing.score != null && <p className="mt-1 text-zinc-600">점수 {existing.score}점</p>}
          {existing.feedback && (
            <p className="mt-2 text-zinc-600">피드백: {existing.feedback}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block space-y-2 text-sm">
          <span className="font-medium">제출 내용</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={8}
            required
            disabled={submitted && existing?.status === "GRADED"}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2"
            placeholder="과제 내용, GitHub 링크, 구현 설명 등을 작성하세요."
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {(!submitted || existing?.status === "RETURNED") && (
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? "제출 중..." : submitted ? "다시 제출" : "과제 제출"}
          </button>
        )}
        {submitted && existing?.status !== "RETURNED" && (
          <p className="text-sm text-emerald-700">제출이 완료되었습니다.</p>
        )}
      </form>
    </section>
  );
}
