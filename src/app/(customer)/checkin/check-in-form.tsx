"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FormOption = {
  id: string;
  label: string;
  emoji: string | null;
};

type FormQuestion = {
  id: string;
  prompt: string;
  type: string;
  isRequired: boolean;
  options: FormOption[];
};

type InitialAnswer = {
  questionId: string;
  optionId: string | null;
  textValue: string | null;
};

const EMPTY_ANSWERS: InitialAnswer[] = [];

function answersToState(initialAnswers: InitialAnswer[]) {
  const selected: Record<string, string> = {};
  const textValues: Record<string, string> = {};

  for (const answer of initialAnswers) {
    if (answer.optionId) {
      selected[answer.questionId] = answer.optionId;
    }
    if (answer.textValue) {
      textValues[answer.questionId] = answer.textValue;
    }
  }

  return { selected, textValues };
}

type CheckInFormProps = {
  formSlug: string;
  questions: FormQuestion[];
  periodDate: string;
  initialAnswers?: InitialAnswer[];
  submitLabel?: string;
};

export function CheckInForm({
  formSlug,
  questions,
  periodDate,
  initialAnswers,
  submitLabel = "저장",
}: CheckInFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(
    () => answersToState(initialAnswers ?? EMPTY_ANSWERS).selected,
  );
  const [textValues, setTextValues] = useState(
    () => answersToState(initialAnswers ?? EMPTY_ANSWERS).textValues,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function selectOption(questionId: string, optionId: string) {
    setSelected((current) => ({ ...current, [questionId]: optionId }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const requiredQuestions = questions.filter((question) => question.isRequired);
    for (const question of requiredQuestions) {
      if (question.type === "SHORT_TEXT" || question.type === "LONG_TEXT") {
        if (!textValues[question.id]?.trim()) {
          setError(`${question.prompt}에 답변해 주세요.`);
          setSubmitting(false);
          return;
        }
        continue;
      }
      if (!selected[question.id]) {
        setError(`${question.prompt}에 답변해 주세요.`);
        setSubmitting(false);
        return;
      }
    }

    const answers: Array<{
      questionId: string;
      optionId?: string;
      textValue?: string;
    }> = [];

    for (const question of questions) {
      if (question.type === "SHORT_TEXT" || question.type === "LONG_TEXT") {
        const text = textValues[question.id]?.trim();
        if (text) {
          answers.push({ questionId: question.id, textValue: text });
        }
        continue;
      }

      const optionId = selected[question.id];
      if (optionId) {
        answers.push({ questionId: question.id, optionId });
      }
    }

    try {
      const response = await fetch(`/api/forms/${formSlug}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, periodDate }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {questions.map((question) => (
        <section key={question.id} className="space-y-3">
          <h2 className="text-base font-medium text-zinc-900">{question.prompt}</h2>

          {question.type === "SHORT_TEXT" || question.type === "LONG_TEXT" ? (
            <textarea
              value={textValues[question.id] ?? ""}
              onChange={(event) =>
                setTextValues((current) => ({
                  ...current,
                  [question.id]: event.target.value,
                }))
              }
              rows={question.type === "LONG_TEXT" ? 4 : 3}
              placeholder="입력하세요"
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none ring-zinc-300 focus:ring-2"
            />
          ) : (
            <div
              className={
                question.options.some((option) => option.emoji)
                  ? "flex flex-wrap gap-2"
                  : "grid gap-2"
              }
            >
              {question.options.map((option) => {
                const isActive = selected[question.id] === option.id;

                if (option.emoji) {
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectOption(question.id, option.id)}
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl transition ${
                        isActive
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                      aria-label={option.label}
                      title={option.label}
                    >
                      {option.emoji}
                    </button>
                  );
                }

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectOption(question.id, option.id)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                      isActive
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ))}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? "저장 중..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
