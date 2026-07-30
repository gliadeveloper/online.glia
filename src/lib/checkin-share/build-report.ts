import type { Prisma } from "@/generated/prisma/client";

import {
  weekdayLabelForDateKey,
} from "@/lib/checkin-share/scope";
import type { CheckInShareReportContent } from "@/lib/checkin-share/types";
import { buildCheckInReportItems } from "@/lib/checkin-report";
import { formatWeekRangeLabel } from "@/lib/checkin-dates";
import { formDetailInclude } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

import { resolveShareScope, type ResolvedShareScope } from "./scope";

type SubmissionWithAnswers = Prisma.FormSubmissionGetPayload<{
  include: {
    answers: {
      include: {
        question: { select: { id: true; prompt: true; order: true; type: true } };
        option: { select: { id: true; label: true; emoji: true } };
      };
    };
  };
}>;

async function loadCheckInForms() {
  const [dailyForm, weeklyForm] = await Promise.all([
    prisma.form.findFirst({
      where: { slug: "daily-checkin", status: "PUBLISHED" },
      include: formDetailInclude,
    }),
    prisma.form.findFirst({
      where: { slug: "weekly-checkin", status: "PUBLISHED" },
      include: formDetailInclude,
    }),
  ]);

  return { dailyForm, weeklyForm };
}

async function loadSubmissions(params: {
  userId: string;
  dailyFormId: string | undefined;
  weeklyFormId: string | undefined;
  dailyDateKeys: string[];
  weeklyPeriodKeys: string[];
}) {
  const [dailySubmissions, weeklySubmissions] = await Promise.all([
    params.dailyFormId && params.dailyDateKeys.length
      ? prisma.formSubmission.findMany({
          where: {
            userId: params.userId,
            formId: params.dailyFormId,
            checkInDate: { in: params.dailyDateKeys },
          },
          include: {
            answers: {
              include: {
                question: { select: { id: true, prompt: true, order: true, type: true } },
                option: { select: { id: true, label: true, emoji: true } },
              },
            },
          },
        })
      : Promise.resolve([] as SubmissionWithAnswers[]),
    params.weeklyFormId && params.weeklyPeriodKeys.length
      ? prisma.formSubmission.findMany({
          where: {
            userId: params.userId,
            formId: params.weeklyFormId,
            checkInDate: { in: params.weeklyPeriodKeys },
          },
          include: {
            answers: {
              include: {
                question: { select: { id: true, prompt: true, order: true, type: true } },
                option: { select: { id: true, label: true, emoji: true } },
              },
            },
          },
        })
      : Promise.resolve([] as SubmissionWithAnswers[]),
  ]);

  return {
    dailyByDate: new Map(dailySubmissions.map((item) => [item.checkInDate, item])),
    weeklyByWeek: new Map(weeklySubmissions.map((item) => [item.checkInDate, item])),
    submissionIds: [...dailySubmissions, ...weeklySubmissions].map((item) => item.id),
  };
}

export function buildReportContentFromScope(params: {
  scope: ResolvedShareScope;
  dailyQuestions: Array<{
    id: string;
    prompt: string;
    type: string;
    order: number;
    options: Array<{ id: string; label: string; emoji: string | null }>;
  }>;
  weeklyQuestions: Array<{
    id: string;
    prompt: string;
    type: string;
    order: number;
    options: Array<{ id: string; label: string; emoji: string | null }>;
  }>;
  dailyByDate: Map<string, SubmissionWithAnswers>;
  weeklyByWeek: Map<string, SubmissionWithAnswers>;
}): CheckInShareReportContent {
  const dailySections = params.scope.dailyDateKeys.map((dateKey) => {
    const submission = params.dailyByDate.get(dateKey);

    return {
      dateKey,
      weekdayLabel: weekdayLabelForDateKey(dateKey),
      recorded: Boolean(submission),
      items: submission
        ? buildCheckInReportItems(params.dailyQuestions, submission.answers)
        : [],
    };
  });

  const weeklySections = params.scope.weeklyPeriodKeys.map((weekPeriodKey) => {
    const submission = params.weeklyByWeek.get(weekPeriodKey);

    return {
      weekPeriodKey,
      periodLabel: formatWeekRangeLabel(weekPeriodKey),
      recorded: Boolean(submission),
      items: submission
        ? buildCheckInReportItems(params.weeklyQuestions, submission.answers)
        : [],
    };
  });

  const dailyRecorded = dailySections.filter((section) => section.recorded).length;
  const weeklyRecorded = weeklySections.filter((section) => section.recorded).length;

  return {
    title: "체크인 공유 리포트",
    scopeLabel: params.scope.scopeLabel,
    scopeType: params.scope.scopeType,
    dailySections,
    weeklySections,
    summary: {
      dailyRecorded,
      dailyInScope: dailySections.length,
      weeklyRecorded,
      weeklyInScope: weeklySections.length,
    },
  };
}

export async function buildCheckInShareReportPayload(params: {
  userId: string;
  scopeType: "WEEK" | "RANGE";
  weekPeriodKey?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}) {
  const { dailyForm, weeklyForm } = await loadCheckInForms();
  const timezone = dailyForm?.timezone ?? weeklyForm?.timezone ?? "Asia/Seoul";

  const scope = resolveShareScope(
    {
      scopeType: params.scopeType,
      weekPeriodKey: params.weekPeriodKey,
      startDate: params.startDate,
      endDate: params.endDate,
    },
    timezone,
  );

  const { dailyByDate, weeklyByWeek, submissionIds } = await loadSubmissions({
    userId: params.userId,
    dailyFormId: dailyForm?.id,
    weeklyFormId: weeklyForm?.id,
    dailyDateKeys: scope.dailyDateKeys,
    weeklyPeriodKeys: scope.weeklyPeriodKeys,
  });

  const content = buildReportContentFromScope({
    scope,
    dailyQuestions: dailyForm?.questions ?? [],
    weeklyQuestions: weeklyForm?.questions ?? [],
    dailyByDate,
    weeklyByWeek,
  });

  const hasShareableRecords =
    content.summary.dailyRecorded > 0 || content.summary.weeklyRecorded > 0;

  return {
    scope,
    content,
    submissionIds,
    hasShareableRecords,
    dailyRecorded: content.summary.dailyRecorded,
    dailyInScope: content.summary.dailyInScope,
    weeklyIncluded: content.summary.weeklyRecorded > 0,
    weeklyCount: content.summary.weeklyRecorded,
  };
}

export function parseReportContent(value: unknown): CheckInShareReportContent {
  return value as CheckInShareReportContent;
}
