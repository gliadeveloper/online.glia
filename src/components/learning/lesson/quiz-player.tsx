"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { TrustAlert, TrustButton } from "@/components/corporate-trust/app-trust-ui";

type Question = {
  id: string;
  prompt: string;
  order: number;
  options: Array<{ id: string; label: string; order: number }>;
};

type QuizPlayerProps = {
  quizId: string;
  courseSlug: string;
  title: string;
  description: string | null;
  passingScore: number;
  questions: Question[];
  previousAttempt: {
    score: number | null;
    isPassed: boolean | null;
    submittedAt: string | null;
  } | null;
};

export function QuizPlayer({
  quizId,
  courseSlug,
  title,
  description,
  passingScore,
  questions,
  previousAttempt,
}: QuizPlayerProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    score: number;
    isPassed: boolean;
    correctCount: number;
    totalQuestions: number;
  } | null>(
    previousAttempt?.submittedAt && previousAttempt.score != null
      ? {
          score: previousAttempt.score,
          isPassed: previousAttempt.isPassed ?? false,
          correctCount: 0,
          totalQuestions: questions.length,
        }
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const payload = questions
      .filter((question) => answers[question.id])
      .map((question) => ({
        questionId: question.id,
        optionId: answers[question.id],
      }));

    if (payload.length < questions.length) {
      setError("모든 문항에 답해 주세요.");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch(`/api/lms/quizzes/${quizId}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseSlug, answers: payload }),
      });

      const data = (await response.json()) as {
        error?: string;
        score?: number;
        isPassed?: boolean;
        correctCount?: number;
        totalQuestions?: number;
      };

      if (!response.ok) {
        setError(data.error ?? "제출에 실패했습니다.");
        return;
      }

      setResult({
        score: data.score ?? 0,
        isPassed: data.isPassed ?? false,
        correctCount: data.correctCount ?? 0,
        totalQuestions: data.totalQuestions ?? questions.length,
      });
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
        합격 점수 {passingScore}% · {questions.length}문항
      </p>

      {result ? (
        <div
          role="status"
          className={`mt-6 rounded-xl px-5 py-4 ${
            result.isPassed ? "trust-alert trust-alert--success" : "trust-alert trust-alert--info"
          }`}
        >
          <p className="font-semibold">
            {result.isPassed ? "합격!" : "아직 합격 점수에 미달입니다"}
          </p>
          <p className="mt-1 text-sm opacity-90">
            점수 {Math.round(result.score)}%
            {result.correctCount > 0
              ? ` · ${result.correctCount}/${result.totalQuestions} 정답`
              : ""}
          </p>
          {!result.isPassed && (
            <button
              type="button"
              onClick={() => setResult(null)}
              className="trust-link corp-trust-focus mt-3 text-sm font-semibold underline"
            >
              다시 응시하기
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {questions.map((question, index) => (
            <fieldset key={question.id} className="trust-quiz-fieldset">
              <legend className="trust-quiz-legend">
                {index + 1}. {question.prompt}
              </legend>
              <div className="mt-3 space-y-2">
                {question.options.map((option) => (
                  <label key={option.id} className="trust-quiz-option">
                    <input
                      type="radio"
                      name={question.id}
                      value={option.id}
                      checked={answers[question.id] === option.id}
                      onChange={() =>
                        setAnswers((current) => ({ ...current, [question.id]: option.id }))
                      }
                      className="shell-focus-ring"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {error && <TrustAlert tone="error">{error}</TrustAlert>}
          <TrustButton type="submit" variant="primary" disabled={busy}>
            {busy ? "채점 중..." : "제출하기"}
          </TrustButton>
        </form>
      )}
    </section>
  );
}
