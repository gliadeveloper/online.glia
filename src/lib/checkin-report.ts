type FormOption = {
  id: string;
  label: string;
  emoji: string | null;
};

type FormQuestion = {
  id: string;
  prompt: string;
  type: string;
  order: number;
  options: FormOption[];
};

type SubmissionAnswer = {
  questionId: string;
  optionId: string | null;
  textValue: string | null;
  option: { id: string; label: string; emoji: string | null } | null;
};

export type CheckInReportItem = {
  questionId: string;
  prompt: string;
  displayValue: string;
  emoji: string | null;
};

export function buildCheckInReportItems(
  questions: FormQuestion[],
  answers: SubmissionAnswer[],
): CheckInReportItem[] {
  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));

  return questions.map((question) => {
    const answer = answerByQuestion.get(question.id);

    if (question.type === "SHORT_TEXT" || question.type === "LONG_TEXT") {
      const text = answer?.textValue?.trim();
      return {
        questionId: question.id,
        prompt: question.prompt,
        displayValue: text || "—",
        emoji: null,
      };
    }

    const option =
      answer?.option ??
      question.options.find((item) => item.id === answer?.optionId) ??
      null;

    return {
      questionId: question.id,
      prompt: question.prompt,
      displayValue: option?.label ?? "—",
      emoji: option?.emoji ?? null,
    };
  });
}
