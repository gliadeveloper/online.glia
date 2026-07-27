import { Prisma } from "@/generated/prisma/client";
import type { Form, FormQuestion } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const formDetailInclude = {
  questions: {
    orderBy: { order: "asc" as const },
    include: {
      options: { orderBy: { order: "asc" as const } },
    },
  },
} satisfies Prisma.FormInclude;

const submissionInclude = {
  answers: {
    include: {
      question: { select: { id: true, prompt: true, order: true, type: true } },
      option: { select: { id: true, label: true, emoji: true } },
    },
  },
} satisfies Prisma.FormSubmissionInclude;

export function getCheckInDate(timezone = "Asia/Seoul", date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** 해당 주의 일요일 날짜 (주간 체크인 period key) */
export function getWeekPeriodKey(timezone = "Asia/Seoul", date = new Date()) {
  const anchor = getCheckInDate(timezone, date);
  let probe = new Date(`${anchor}T12:00:00`);

  for (let i = 0; i < 7; i += 1) {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    }).format(probe);

    if (weekday === "Sun") {
      return getCheckInDate(timezone, probe);
    }

    probe = new Date(probe.getTime() - 24 * 60 * 60 * 1000);
  }

  return anchor;
}

export function resolvePeriodKey(
  form: Pick<Form, "schedule" | "timezone">,
  date = new Date(),
) {
  if (form.schedule === "WEEKLY") {
    return getWeekPeriodKey(form.timezone, date);
  }

  return getCheckInDate(form.timezone, date);
}

export type SubmitAnswerInput = {
  questionId: string;
  optionId?: string;
  optionIds?: string[];
  textValue?: string;
  numberValue?: number;
};

function isAnswerEmpty(
  question: FormQuestion,
  answer: SubmitAnswerInput | undefined,
) {
  if (!answer) {
    return true;
  }

  switch (question.type) {
    case "SHORT_TEXT":
    case "LONG_TEXT":
      return !answer.textValue?.trim();
    case "SINGLE_CHOICE":
    case "YES_NO":
    case "SCALE":
      return !answer.optionId;
    case "MULTIPLE_CHOICE":
      return !answer.optionIds?.length;
    default:
      return true;
  }
}

export function validateSubmissionAnswers(
  questions: Array<
    FormQuestion & {
      options: Array<{ id: string }>;
    }
  >,
  answers: SubmitAnswerInput[],
) {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));

  for (const question of questions) {
    const answer = answerMap.get(question.id);

    if (question.isRequired && isAnswerEmpty(question, answer)) {
      throw new ApiError(
        `Required question not answered: ${question.prompt}`,
        400,
        "REQUIRED_ANSWER_MISSING",
      );
    }

    if (!answer || isAnswerEmpty(question, answer)) {
      continue;
    }

    if (answer.optionId) {
      const valid = question.options.some((option) => option.id === answer.optionId);
      if (!valid) {
        throw new ApiError(`Invalid option for question: ${question.prompt}`, 400, "INVALID_OPTION");
      }
    }

    if (answer.optionIds?.length) {
      const validIds = new Set(question.options.map((option) => option.id));
      const allValid = answer.optionIds.every((id) => validIds.has(id));
      if (!allValid) {
        throw new ApiError(`Invalid options for question: ${question.prompt}`, 400, "INVALID_OPTION");
      }
    }
  }
}

function buildAnswerRows(
  questions: Array<FormQuestion & { options: Array<{ id: string }> }>,
  answers: SubmitAnswerInput[],
) {
  return answers
    .filter((answer) => {
      const question = questions.find((item) => item.id === answer.questionId);
      return question && !isAnswerEmpty(question, answer);
    })
    .map((answer) => ({
      questionId: answer.questionId,
      optionId: answer.optionId,
      optionIds: answer.optionIds,
      textValue: answer.textValue?.trim() || null,
      numberValue: answer.numberValue,
    }));
}

export async function getPublishedFormBySlug(slug: string) {
  const form = await prisma.form.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: formDetailInclude,
  });

  if (!form) {
    throw new ApiError("Form not found", 404, "FORM_NOT_FOUND");
  }

  return form;
}

export async function getFormSubmission(params: {
  formId: string;
  userId: string;
  periodKey: string;
}) {
  return prisma.formSubmission.findUnique({
    where: {
      formId_userId_checkInDate: {
        formId: params.formId,
        userId: params.userId,
        checkInDate: params.periodKey,
      },
    },
    include: submissionInclude,
  });
}

export async function listFormSubmissionHistory(params: {
  formId: string;
  userId: string;
  limit?: number;
}) {
  return prisma.formSubmission.findMany({
    where: {
      formId: params.formId,
      userId: params.userId,
    },
    orderBy: { checkInDate: "desc" },
    take: params.limit ?? 30,
    include: submissionInclude,
  });
}

export async function getCheckInOverview(userId: string) {
  const forms = await prisma.form.findMany({
    where: {
      status: "PUBLISHED",
      purpose: { in: ["DAILY_CHECKIN", "WEEKLY_CHECKIN"] },
    },
    include: formDetailInclude,
    orderBy: [{ schedule: "asc" }, { title: "asc" }],
  });

  return Promise.all(
    forms.map(async (form) => {
      const periodKey = resolvePeriodKey(form);
      const submission = await getFormSubmission({
        formId: form.id,
        userId,
        periodKey,
      });

      return {
        form: {
          id: form.id,
          slug: form.slug,
          title: form.title,
          description: form.description,
          schedule: form.schedule,
          purpose: form.purpose,
          timezone: form.timezone,
        },
        periodKey,
        hasSubmission: Boolean(submission),
        submission,
      };
    }),
  );
}

/** @deprecated use getCheckInOverview */
export async function getTodayCheckInStatus(userId: string) {
  const overview = await getCheckInOverview(userId);
  return overview
    .filter((item) => item.form.purpose === "DAILY_CHECKIN")
    .map((item) => ({
      form: {
        id: item.form.id,
        slug: item.form.slug,
        title: item.form.title,
        description: item.form.description,
        timezone: item.form.timezone,
        questionCount: 0,
      },
      checkInDate: item.periodKey,
      completed: item.hasSubmission,
      submission: item.submission,
    }));
}

export async function upsertFormSubmission(params: {
  form: Form;
  userId: string;
  answers: SubmitAnswerInput[];
  periodDate?: string;
}) {
  const form = await prisma.form.findUniqueOrThrow({
    where: { id: params.form.id },
    include: formDetailInclude,
  });

  if (form.status !== "PUBLISHED") {
    throw new ApiError("Form is not published", 409, "FORM_NOT_PUBLISHED");
  }

  validateSubmissionAnswers(form.questions, params.answers);

  const referenceDate = params.periodDate
    ? new Date(`${params.periodDate}T12:00:00`)
    : new Date();

  if (params.periodDate && !/^\d{4}-\d{2}-\d{2}$/.test(params.periodDate)) {
    throw new ApiError("periodDate must be YYYY-MM-DD", 400, "INVALID_PERIOD_DATE");
  }

  const periodKey =
    form.schedule === "WEEKLY"
      ? getWeekPeriodKey(form.timezone, referenceDate)
      : params.periodDate ?? getCheckInDate(form.timezone, referenceDate);

  const answerRows = buildAnswerRows(form.questions, params.answers);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.formSubmission.findUnique({
      where: {
        formId_userId_checkInDate: {
          formId: form.id,
          userId: params.userId,
          checkInDate: periodKey,
        },
      },
    });

    const submission = existing
      ? await tx.formSubmission.update({
          where: { id: existing.id },
          data: {
            answers: {
              deleteMany: {},
              create: answerRows,
            },
          },
          include: submissionInclude,
        })
      : await tx.formSubmission.create({
          data: {
            formId: form.id,
            userId: params.userId,
            checkInDate: periodKey,
            answers: { create: answerRows },
          },
          include: submissionInclude,
        });

    await tx.auditLog.create({
      data: {
        actorId: params.userId,
        entityType: "FormSubmission",
        entityId: submission.id,
        action: existing ? "CHECKIN_UPDATED" : "CHECKIN_SUBMITTED",
        metadata: {
          formSlug: form.slug,
          periodKey,
        },
      },
    });

    return submission;
  });
}

/** @deprecated use upsertFormSubmission */
export async function submitForm(params: {
  form: Form;
  userId: string;
  answers: SubmitAnswerInput[];
  periodDate?: string;
}) {
  return upsertFormSubmission(params);
}

export async function createForm(params: {
  createdById: string;
  slug: string;
  title: string;
  description?: string;
  purpose?: Form["purpose"];
  schedule?: Form["schedule"];
  timezone?: string;
  organizationId?: string;
  courseId?: string;
  questions: Array<{
    prompt: string;
    description?: string;
    type: FormQuestion["type"];
    order: number;
    isRequired?: boolean;
    options?: Array<{
      label: string;
      value?: string;
      emoji?: string;
      order: number;
    }>;
  }>;
  publish?: boolean;
}) {
  return prisma.form.create({
    data: {
      slug: params.slug,
      title: params.title,
      description: params.description,
      purpose: params.purpose ?? "SURVEY",
      schedule: params.schedule ?? "ONCE",
      status: params.publish ? "PUBLISHED" : "DRAFT",
      publishedAt: params.publish ? new Date() : null,
      timezone: params.timezone ?? "Asia/Seoul",
      createdById: params.createdById,
      organizationId: params.organizationId,
      courseId: params.courseId,
      questions: {
        create: params.questions.map((question) => ({
          prompt: question.prompt,
          description: question.description,
          type: question.type,
          order: question.order,
          isRequired: question.isRequired ?? true,
          options: question.options?.length
            ? {
                create: question.options.map((option) => ({
                  label: option.label,
                  value: option.value,
                  emoji: option.emoji,
                  order: option.order,
                })),
              }
            : undefined,
        })),
      },
    },
    include: formDetailInclude,
  });
}

export function answersToInitialState(
  answers: Array<{
    questionId: string;
    optionId: string | null;
    textValue: string | null;
  }>,
) {
  const selected: Record<string, string> = {};
  const textValues: Record<string, string> = {};

  for (const answer of answers) {
    if (answer.optionId) {
      selected[answer.questionId] = answer.optionId;
    }
    if (answer.textValue) {
      textValues[answer.questionId] = answer.textValue;
    }
  }

  return { selected, textValues };
}
