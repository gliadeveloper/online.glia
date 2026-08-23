"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Question = {
  id: string;
  prompt: string;
  order: number;
  options: Array<{ id: string; label: string; order: number }>;
};

type QuizPlayerProps = {
  quizId: string;
  courseId: string;
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
  courseId,
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
        body: JSON.stringify({ courseId, answers: payload }),
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
    <section className="lesson-task">
      <h2 className="lesson-task__title">{title}</h2>
      {description ? <p className="lesson-task__desc">{description}</p> : null}
      <p className="lesson-task__meta">
        합격 점수 {passingScore}% · {questions.length}문항
      </p>

      {result ? (
        <div
          role="status"
          className={`lesson-task__result ${
            result.isPassed ? "lesson-task__result--pass" : "lesson-task__result--fail"
          }`}
        >
          <p className="lesson-task__result-title">
            {result.isPassed ? "합격!" : "아직 합격 점수에 미달입니다"}
          </p>
          <p className="lesson-task__result-body">
            점수 {Math.round(result.score)}%
            {result.correctCount > 0
              ? ` · ${result.correctCount}/${result.totalQuestions} 정답`
              : ""}
          </p>
          {!result.isPassed ? (
            <button type="button" onClick={() => setResult(null)} className="lesson-task__retry">
              다시 응시하기
            </button>
          ) : null}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="lesson-task__form">
          {questions.map((question, index) => (
            <fieldset key={question.id} className="lesson-task__fieldset">
              <legend className="lesson-task__legend">
                {index + 1}. {question.prompt}
              </legend>
              <div className="lesson-task__options">
                {question.options.map((option) => (
                  <label key={option.id} className="lesson-task__option">
                    <input
                      type="radio"
                      name={question.id}
                      value={option.id}
                      checked={answers[question.id] === option.id}
                      onChange={() =>
                        setAnswers((current) => ({ ...current, [question.id]: option.id }))
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {error ? (
            <p className="lesson-task__alert lesson-task__alert--error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="lesson-task__btn" disabled={busy}>
            {busy ? "채점 중..." : "제출하기"}
          </button>
        </form>
      )}
    </section>
  );
}
