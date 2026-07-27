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

type LessonAssessmentPanelProps = {
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

export function LessonAssessmentPanel({
  lessonId,
  lessonType,
  quiz,
  assignment,
}: LessonAssessmentPanelProps) {
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
      const response = await fetch(`/api/admin/lessons/${lessonId}/quiz`, {
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
      const response = await fetch(`/api/admin/lessons/${lessonId}/assignment`, {
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

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question,
      ),
    );
  }

  function updateOption(questionIndex: number, optionIndex: number, patch: Partial<QuestionOption>) {
    setQuestions((current) =>
      current.map((question, qi) =>
        qi === questionIndex
          ? {
              ...question,
              options: question.options.map((option, oi) =>
                oi === optionIndex ? { ...option, ...patch } : option,
              ),
            }
          : question,
      ),
    );
  }

  if (lessonType !== "QUIZ" && lessonType !== "ASSIGNMENT") {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
        이 레슨은 VIDEO/TEXT 타입입니다. 커리큘럼 편집기에서 콘텐츠를 관리하세요.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {lessonType === "QUIZ" && (
        <form onSubmit={saveQuiz} className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">퀴즈 편집</h2>
            {quiz && (
              <span className="text-xs text-zinc-500">{quiz.questions.length}문항</span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm sm:col-span-2">
              <span className="font-medium">제목</span>
              <input
                value={quizTitle}
                onChange={(event) => setQuizTitle(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                required
              />
            </label>
            <label className="space-y-2 text-sm sm:col-span-2">
              <span className="font-medium">설명</span>
              <textarea
                value={quizDescription}
                onChange={(event) => setQuizDescription(event.target.value)}
                rows={2}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">합격 점수 (%)</span>
              <input
                type="number"
                value={passingScore}
                onChange={(event) => setPassingScore(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">제한 시간 (분, 선택)</span>
              <input
                type="number"
                value={timeLimitMinutes}
                onChange={(event) => setTimeLimitMinutes(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
            </label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">문항</h3>
              <button
                type="button"
                onClick={() =>
                  setQuestions((current) => [
                    ...current,
                    {
                      prompt: "",
                      order: current.length + 1,
                      options: [
                        { label: "", order: 1, isCorrect: false },
                        { label: "", order: 2, isCorrect: true },
                      ],
                    },
                  ])
                }
                className="text-sm font-medium text-violet-600"
              >
                + 문항 추가
              </button>
            </div>

            {questions.map((question, questionIndex) => (
              <div key={questionIndex} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">질문 {questionIndex + 1}</span>
                  <input
                    value={question.prompt}
                    onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2"
                    placeholder="질문 내용"
                  />
                </label>
                <ul className="mt-3 space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <li key={optionIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${questionIndex}`}
                        checked={option.isCorrect ?? false}
                        onChange={() =>
                          setQuestions((current) =>
                            current.map((item, qi) =>
                              qi === questionIndex
                                ? {
                                    ...item,
                                    options: item.options.map((opt, oi) => ({
                                      ...opt,
                                      isCorrect: oi === optionIndex,
                                    })),
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                      <input
                        value={option.label}
                        onChange={(event) =>
                          updateOption(questionIndex, optionIndex, { label: event.target.value })
                        }
                        className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                        placeholder={`선택지 ${optionIndex + 1}`}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            퀴즈 저장
          </button>
        </form>
      )}

      {lessonType === "ASSIGNMENT" && (
        <form
          onSubmit={saveAssignment}
          className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h2 className="font-semibold">과제 편집</h2>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">제목</span>
            <input
              value={assignmentTitle}
              onChange={(event) => setAssignmentTitle(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              required
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">설명</span>
            <textarea
              value={assignmentDescription}
              onChange={(event) => setAssignmentDescription(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">만점</span>
              <input
                type="number"
                value={maxScore}
                onChange={(event) => setMaxScore(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">마감일</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            과제 저장
          </button>
        </form>
      )}

      <p className="text-xs text-zinc-500">
        레슨 메타데이터는 커리큘럼 편집기에서 변경할 수 있습니다.
      </p>
    </div>
  );
}
