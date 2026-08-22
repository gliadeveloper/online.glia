"use client";

import { Check, HeartPulse } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { withCheckInReportSavedQuery } from "@/lib/checkin-routes";
import { StackNavTrailingLabel } from "@/lib/stack-nav-context";

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

function validateQuestion(
  question: FormQuestion,
  selected: Record<string, string>,
  textValues: Record<string, string>,
): string | null {
  if (!question.isRequired) {
    return null;
  }

  if (question.type === "SHORT_TEXT" || question.type === "LONG_TEXT") {
    return textValues[question.id]?.trim() ? null : `${question.prompt}에 답변해 주세요.`;
  }

  return selected[question.id] ? null : `${question.prompt}에 답변해 주세요.`;
}

type CheckInQuestionFieldProps = {
  question: FormQuestion;
  selected: Record<string, string>;
  textValues: Record<string, string>;
  onSelectOption: (questionId: string, optionId: string) => void;
  onTextChange: (questionId: string, value: string) => void;
};

function CheckInQuestionField({
  question,
  selected,
  textValues,
  onSelectOption,
  onTextChange,
}: CheckInQuestionFieldProps) {
  const inputId = `question-${question.id}`;
  const isText = question.type === "SHORT_TEXT" || question.type === "LONG_TEXT";
  const isChoice = !isText;
  const hasEmoji = question.options.some((option) => option.emoji);

  return (
    <fieldset className="glia-ci-form__fieldset" aria-labelledby={`${inputId}-heading`}>
      <legend id={`${inputId}-heading`} className="sr-only">
        {question.prompt}
        {question.isRequired ? " (필수)" : ""}
      </legend>

      {isText ? (
        <textarea
          id={inputId}
          value={textValues[question.id] ?? ""}
          onChange={(event) => onTextChange(question.id, event.target.value)}
          rows={question.type === "LONG_TEXT" ? 5 : 3}
          placeholder="편하게 적어 보세요"
          aria-required={question.isRequired}
          className="glia-ci-input"
        />
      ) : (
        <div
          role={question.options.length > 1 ? "radiogroup" : undefined}
          aria-labelledby={`${inputId}-heading`}
          className={hasEmoji ? "glia-ci-emoji" : "glia-ci-choices"}
        >
          {question.options.map((option) => {
            const isActive = selected[question.id] === option.id;

            if (option.emoji) {
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectOption(question.id, option.id)}
                  aria-pressed={isActive}
                  aria-label={option.label}
                  className={`glia-ci-emoji-btn${isActive ? " glia-ci-emoji-btn--on" : ""}`}
                >
                  <span className="glia-ci-emoji-btn__face" aria-hidden="true">
                    {option.emoji}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectOption(question.id, option.id)}
                aria-pressed={isActive}
                className={`glia-ci-choice${isActive ? " glia-ci-choice--on" : ""}`}
              >
                <span
                  className={`glia-ci-choice__mark${isActive ? " glia-ci-choice__mark--on" : ""}`}
                  aria-hidden="true"
                >
                  {isActive ? <Check strokeWidth={2.5} size={14} /> : null}
                </span>
                <span className="glia-ci-choice__label">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {isChoice && question.isRequired ? <p className="sr-only">하나를 선택해 주세요.</p> : null}
    </fieldset>
  );
}

type CheckInFormProps = {
  formSlug: string;
  questions: FormQuestion[];
  periodDate: string;
  initialAnswers?: InitialAnswer[];
  reportHref: string;
  submitLabel?: string;
  eyebrow?: string;
  heading?: string;
  lede?: string;
};

export function CheckInForm({
  formSlug,
  questions,
  periodDate,
  initialAnswers,
  reportHref,
  submitLabel = "저장",
  eyebrow = "Check-in",
  heading = "오늘의 체크",
  lede = "짧게 돌아보고 오늘의 리듬을 남겨 보세요.",
}: CheckInFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [selected, setSelected] = useState(
    () => answersToState(initialAnswers ?? EMPTY_ANSWERS).selected,
  );
  const [textValues, setTextValues] = useState(
    () => answersToState(initialAnswers ?? EMPTY_ANSWERS).textValues,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const question = questions[currentStep];
  const totalSteps = questions.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const stepLabel = `${currentStep + 1} / ${totalSteps}`;
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  function selectOption(questionId: string, optionId: string) {
    setSelected((current) => ({ ...current, [questionId]: optionId }));
    setError(null);
  }

  function handleTextChange(questionId: string, value: string) {
    setTextValues((current) => ({ ...current, [questionId]: value }));
    setError(null);
  }

  function goBack() {
    setError(null);
    setCurrentStep((step) => Math.max(0, step - 1));
  }

  function goNext() {
    if (!question) {
      return;
    }

    const validationError = validateQuestion(question, selected, textValues);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setCurrentStep((step) => Math.min(totalSteps - 1, step + 1));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!isLastStep) {
      goNext();
      return;
    }

    if (!question) {
      return;
    }

    const validationError = validateQuestion(question, selected, textValues);
    if (validationError) {
      setError(validationError);
      return;
    }

    for (const item of questions) {
      const itemError = validateQuestion(item, selected, textValues);
      if (itemError) {
        setError(itemError);
        return;
      }
    }

    setError(null);
    setSubmitting(true);

    const answers: Array<{
      questionId: string;
      optionId?: string;
      textValue?: string;
    }> = [];

    for (const item of questions) {
      if (item.type === "SHORT_TEXT" || item.type === "LONG_TEXT") {
        const text = textValues[item.id]?.trim();
        if (text) {
          answers.push({ questionId: item.id, textValue: text });
        }
        continue;
      }

      const optionId = selected[item.id];
      if (optionId) {
        answers.push({ questionId: item.id, optionId });
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

      router.push(withCheckInReportSavedQuery(reportHref));
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!question) {
    return null;
  }

  return (
    <>
      <StackNavTrailingLabel label={stepLabel} />

      <form onSubmit={handleSubmit} className="glia-ci-form" noValidate>
        <header className="glia-ci-form__hero">
          <div className="glia-ci-form__ambient" aria-hidden="true">
            <span className="glia-ci-form__blob glia-ci-form__blob--mint" />
            <span className="glia-ci-form__blob glia-ci-form__blob--blue" />
            <span className="glia-ci-form__blob glia-ci-form__blob--wash" />
          </div>

          <p className="glia-ci-form__eyebrow">{eyebrow}</p>
          <h1 className="glia-ci-form__heading">{heading}</h1>
          <p className="glia-ci-form__lede">{lede}</p>

          <div className="glia-ci-form__meter">
            <p className="glia-ci-form__meter-label">{stepLabel}</p>
            <div
              className="glia-ci-form__progress"
              role="progressbar"
              aria-valuenow={currentStep + 1}
              aria-valuemin={1}
              aria-valuemax={totalSteps}
              aria-label={`체크인 ${stepLabel}`}
            >
              <span style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </header>

        <div className="glia-ci-form__panel">
          <div className="glia-ci-form__step" key={question.id}>
            <div className="glia-ci-form__prompt-row">
              <span className="glia-ci-icon glia-ci-icon--recovery" aria-hidden="true">
                <HeartPulse strokeWidth={2} size={24} />
              </span>
              <h2 className="glia-ci-form__prompt">
                {question.prompt}
                {question.isRequired ? (
                  <span className="glia-ci-form__required" aria-hidden="true">
                    *
                  </span>
                ) : null}
              </h2>
            </div>

            <CheckInQuestionField
              question={question}
              selected={selected}
              textValues={textValues}
              onSelectOption={selectOption}
              onTextChange={handleTextChange}
            />

            {error ? <p className="glia-ci-alert glia-ci-alert--error">{error}</p> : null}
          </div>
        </div>

        <div className="glia-ci-form__footer">
          {!isFirstStep ? (
            <button type="button" onClick={goBack} className="glia-ci-btn glia-ci-btn--secondary">
              이전
            </button>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="glia-ci-btn glia-ci-btn--primary glia-ci-form__submit"
          >
            {submitting ? "저장 중..." : isLastStep ? submitLabel : "다음"}
          </button>
        </div>
      </form>
    </>
  );
}
