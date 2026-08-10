"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { TrustAlert } from "@/components/corporate-trust/app-trust-ui";
import { Typography } from "@/components/typography/typography";
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
    return textValues[question.id]?.trim()
      ? null
      : `${question.prompt}에 답변해 주세요.`;
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
    <fieldset className="check-in-form__fieldset" aria-labelledby={`${inputId}-heading`}>
      <Typography as="legend" id={`${inputId}-heading`} className="sr-only">
        {question.prompt}
        {question.isRequired ? " (필수)" : ""}
      </Typography>

      {isText ? (
        <textarea
          id={inputId}
          value={textValues[question.id] ?? ""}
          onChange={(event) => onTextChange(question.id, event.target.value)}
          rows={question.type === "LONG_TEXT" ? 5 : 3}
          placeholder="입력하세요"
          aria-required={question.isRequired}
          className="check-in-form__textarea corp-trust-input corp-trust-focus shell-focus-ring"
        />
      ) : (
        <div
          role={question.options.length > 1 ? "radiogroup" : undefined}
          aria-labelledby={`${inputId}-heading`}
          className={
            hasEmoji ? "check-in-form__emoji-group" : "check-in-form__choice-group"
          }
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
                  className={`check-in-form__emoji-choice shell-focus-ring${isActive ? " check-in-form__emoji-choice--active" : ""}`}
                >
                  <Typography as="span" role="bodyCompact" aria-hidden="true">
                    {option.emoji}
                  </Typography>
                </button>
              );
            }

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectOption(question.id, option.id)}
                aria-pressed={isActive}
                className={`check-in-form__choice shell-focus-ring${isActive ? " check-in-form__choice--active" : ""}`}
              >
                <Typography as="span" role="bodySecondary" weight={isActive ? "semibold" : "regular"}>
                  {option.label}
                </Typography>
              </button>
            );
          })}
        </div>
      )}

      {isChoice && question.isRequired && (
        <p className="sr-only">하나를 선택해 주세요.</p>
      )}
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
};

export function CheckInForm({
  formSlug,
  questions,
  periodDate,
  initialAnswers,
  reportHref,
  submitLabel = "저장",
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

      <form onSubmit={handleSubmit} className="check-in-form check-in-form--step" noValidate>
        <div className="check-in-form__top-row" aria-hidden="true">
          <span />
          <Typography as="span" role="caption" color="secondary" className="check-in-form__step-label">
            {stepLabel}
          </Typography>
        </div>

        <div
          className="check-in-form__progress-track"
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`체크인 ${stepLabel}`}
        >
          <span
            className="check-in-form__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="check-in-form__step-body" key={question.id}>
          <Typography
            as="h2"
            role="pageTitle"
            weight="semibold"
            color="primary"
            className="check-in-form__prompt"
          >
            {question.prompt}
            {question.isRequired && (
              <span className="check-in-form__required" aria-hidden="true">
                *
              </span>
            )}
          </Typography>

          <CheckInQuestionField
            question={question}
            selected={selected}
            textValues={textValues}
            onSelectOption={selectOption}
            onTextChange={handleTextChange}
          />

          {error && (
            <TrustAlert tone="error">{error}</TrustAlert>
          )}
        </div>

        <div className="check-in-form__footer check-in-form__footer--fixed">
          {!isFirstStep ? (
            <button
              type="button"
              onClick={goBack}
              className="check-in-form__nav-btn check-in-form__nav-btn--prev shell-focus-ring"
            >
              <Typography as="span" role="bodySecondary" weight="medium">
                이전
              </Typography>
            </button>
          ) : (
            <span className="check-in-form__nav-spacer" aria-hidden="true" />
          )}

          <button
            type="submit"
            disabled={submitting}
            className="check-in-form__nav-btn check-in-form__nav-btn--next shell-focus-ring"
          >
            <Typography as="span" role="bodySecondary" weight="semibold">
              {submitting ? "저장 중..." : isLastStep ? submitLabel : "다음"}
            </Typography>
          </button>
        </div>
      </form>
    </>
  );
}
