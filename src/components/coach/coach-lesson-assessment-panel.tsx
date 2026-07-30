"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type QuestionOption = { label: string; order: number; isCorrect?: boolean };
type QuestionDraft = { prompt: string; order: number; options: QuestionOption[] };

type QuizData = {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  timeLimitMinutes: number | null;
  questions: Array<{
    id: string;
    prompt: string;
    order: number;
    options: Array<{ id: string; label: string; order: number; isCorrect: boolean }>;
  }>;
} | null;

type AssignmentData = {
  id: string;
  title: string;
  description: string | null;
  maxScore: number;
  dueDate: string | null;
} | null;

type CoachLessonAssessmentPanelProps = {
  lessonId: string;
  lessonType: string;
  quiz: QuizData;
  assignment: AssignmentData;
};

function toQuestionDrafts(quiz: QuizData): QuestionDraft[] {
  if (!quiz?.questions.length) {
    return [
      {
        prompt: "",
        order: 1,
        options: [
          { label: "", order: 1, isCorrect: false },
          { label: "", order: 2, isCorrect: true },
        ],
      },
    ];
  }

  return quiz.questions.map((question) => ({
    prompt: question.prompt,
    order: question.order,
    options: question.options.map((option) => ({
      label: option.label,
      order: option.order,
      isCorrect: option.isCorrect,
    })),
  }));
}

export function CoachLessonAssessmentPanel({
  lessonId,
  lessonType,
  quiz,
  assignment,
}: CoachLessonAssessmentPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [quizTitle, setQuizTitle] = useState(quiz?.title ?? "");
  const [quizDescription, setQuizDescription] = useState(quiz?.description ?? "");
  const [passingScore, setPassingScore] = useState(String(quiz?.passingScore ?? 70));
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(
    quiz?.timeLimitMinutes != null ? String(quiz.timeLimitMinutes) : "",
  );
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => toQuestionDrafts(quiz));

  const [assignmentTitle, setAssignmentTitle] = useState(assignment?.title ?? "");
  const [assignmentDescription, setAssignmentDescription] = useState(assignment?.description ?? "");
  const [maxScore, setMaxScore] = useState(String(assignment?.maxScore ?? 100));
  const [dueDate, setDueDate] = useState(
    assignment?.dueDate ? assignment.dueDate.slice(0, 10) : "",
  );

  async function saveQuiz(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/coach/lessons/${lessonId}/quiz`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quizTitle,
          description: quizDescription || undefined,
          passingScore: Number(passingScore),
          timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
          questions: questions
            .filter((question) => question.prompt.trim())
            .map((question, index) => ({
              ...question,
              order: index + 1,
              options: question.options
                .filter((option) => option.label.trim())
                .map((option, optionIndex) => ({
                  ...option,
                  order: optionIndex + 1,
                })),
            })),
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "퀴즈 저장에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  async function saveAssignment(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/coach/lessons/${lessonId}/assignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: assignmentTitle,
          description: assignmentDescription || undefined,
          maxScore: Number(maxScore),
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "과제 저장에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  if (lessonType !== "QUIZ" && lessonType !== "ASSIGNMENT") {
    return null;
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-zinc-900">평가 설정</h2>
      {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {lessonType === "QUIZ" && (
        <form onSubmit={saveQuiz} className="mt-4 space-y-4">
          <label className="block space-y-2 text-sm">
            <span className="font-medium">퀴즈 제목</span>
            <input
              value={quizTitle}
              onChange={(event) => setQuizTitle(event.target.value)}
              required
              className="w-full rounded-xl border border-zinc-200 px-4 py-3"
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">설명</span>
            <textarea
              value={quizDescription}
              onChange={(event) => setQuizDescription(event.target.value)}
              rows={2}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm">
              <span className="font-medium">합격 점수 (%)</span>
              <input
                type="number"
                value={passingScore}
                onChange={(event) => setPassingScore(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">제한 시간 (분)</span>
              <input
                type="number"
                value={timeLimitMinutes}
                onChange={(event) => setTimeLimitMinutes(event.target.value)}
                placeholder="없음"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3"
              />
            </label>
          </div>

          <div className="space-y-4">
            {questions.map((question, questionIndex) => (
              <div key={questionIndex} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">문항 {questionIndex + 1}</span>
                  <input
                    value={question.prompt}
                    onChange={(event) => {
                      const next = [...questions];
                      next[questionIndex] = { ...question, prompt: event.target.value };
                      setQuestions(next);
                    }}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3"
                  />
                </label>
                <ul className="mt-3 space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <li key={optionIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${questionIndex}`}
                        checked={option.isCorrect}
                        onChange={() => {
                          const next = [...questions];
                          next[questionIndex] = {
                            ...question,
                            options: question.options.map((item, idx) => ({
                              ...item,
                              isCorrect: idx === optionIndex,
                            })),
                          };
                          setQuestions(next);
                        }}
                      />
                      <input
                        value={option.label}
                        onChange={(event) => {
                          const next = [...questions];
                          const options = [...question.options];
                          options[optionIndex] = { ...option, label: event.target.value };
                          next[questionIndex] = { ...question, options };
                          setQuestions(next);
                        }}
                        placeholder={`선택지 ${optionIndex + 1}`}
                        className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setQuestions([
                  ...questions,
                  {
                    prompt: "",
                    order: questions.length + 1,
                    options: [
                      { label: "", order: 1, isCorrect: false },
                      { label: "", order: 2, isCorrect: true },
                    ],
                  },
                ])
              }
              className="text-sm font-medium text-emerald-700"
            >
              + 문항 추가
            </button>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            퀴즈 저장
          </button>
        </form>
      )}

      {lessonType === "ASSIGNMENT" && (
        <form onSubmit={saveAssignment} className="mt-4 space-y-4">
          <label className="block space-y-2 text-sm">
            <span className="font-medium">과제 제목</span>
            <input
              value={assignmentTitle}
              onChange={(event) => setAssignmentTitle(event.target.value)}
              required
              className="w-full rounded-xl border border-zinc-200 px-4 py-3"
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">설명</span>
            <textarea
              value={assignmentDescription}
              onChange={(event) => setAssignmentDescription(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm">
              <span className="font-medium">만점</span>
              <input
                type="number"
                value={maxScore}
                onChange={(event) => setMaxScore(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">마감일</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            과제 저장
          </button>
        </form>
      )}
    </section>
  );
}
