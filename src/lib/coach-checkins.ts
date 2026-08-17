import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export type CoachCheckInKind = "daily" | "weekly";

const purposeByKind = {
  daily: "DAILY_CHECKIN",
  weekly: "WEEKLY_CHECKIN",
} as const;

function formatAnswer(answer: {
  option?: { label: string } | null;
  optionIds: unknown;
  textValue: string | null;
  numberValue: number | null;
  question: { options: { id: string; label: string }[] };
}) {
  if (answer.option) return answer.option.label;
  if (Array.isArray(answer.optionIds)) {
    const labels = answer.optionIds
      .filter((id): id is string => typeof id === "string")
      .map((id) => answer.question.options.find((option) => option.id === id)?.label)
      .filter((label): label is string => Boolean(label));
    if (labels.length > 0) return labels.join(", ");
  }
  if (answer.textValue) return answer.textValue;
  if (answer.numberValue !== null) return String(answer.numberValue);
  return "응답 없음";
}

export type CoachCheckInMemberRow = {
  publicUserId: string;
  nickname: string | null;
  avatarUrl: string | null;
  latestDailyDate: string | null;
  latestWeeklyDate: string | null;
};

export async function listCoachCheckInMembers(coachId: string): Promise<CoachCheckInMemberRow[]> {
  const accesses = await prisma.coachCheckInAccess.findMany({
    where: { coachId, revokedAt: null, user: { status: "ACTIVE" } },
    orderBy: { grantedAt: "desc" },
    select: {
      user: { select: { id: true, userId: true, name: true, profile: { select: { avatarUrl: true } } } },
    },
  });

  const users = accesses
    .map((access) => access.user)
    .filter((user): user is typeof user & { userId: string } => Boolean(user.userId));
  if (users.length === 0) return [];

  const submissions = await prisma.formSubmission.findMany({
    where: {
      userId: { in: users.map((user) => user.id) },
      form: { purpose: { in: ["DAILY_CHECKIN", "WEEKLY_CHECKIN"] } },
    },
    orderBy: { checkInDate: "desc" },
    select: { userId: true, checkInDate: true, form: { select: { purpose: true } } },
  });

  const latest = new Map<string, { daily: string | null; weekly: string | null }>();
  for (const submission of submissions) {
    const value = latest.get(submission.userId) ?? { daily: null, weekly: null };
    const kind = submission.form.purpose === "DAILY_CHECKIN" ? "daily" : "weekly";
    if (!value[kind]) value[kind] = submission.checkInDate;
    latest.set(submission.userId, value);
  }

  return users.map((user) => ({
    publicUserId: user.userId,
    nickname: user.name,
    avatarUrl: user.profile?.avatarUrl ?? null,
    latestDailyDate: latest.get(user.id)?.daily ?? null,
    latestWeeklyDate: latest.get(user.id)?.weekly ?? null,
  }));
}

async function getAuthorizedMember(coachId: string, memberPublicUserId: string) {
  const member = await prisma.user.findFirst({
    where: {
      userId: memberPublicUserId.toLowerCase(),
      status: "ACTIVE",
      checkInAccessGrantedToCoaches: { some: { coachId, revokedAt: null } },
    },
    select: { id: true, userId: true, name: true, profile: { select: { avatarUrl: true } } },
  });
  if (!member || !member.userId) {
    throw new ApiError("열람 권한이 없거나 회원을 찾을 수 없습니다.", 404, "CHECKIN_ACCESS_NOT_FOUND");
  }
  return member as typeof member & { userId: string };
}

export async function getCoachCheckInMember(coachId: string, memberPublicUserId: string) {
  return getAuthorizedMember(coachId, memberPublicUserId);
}

export async function listCoachCheckInSubmissions(params: {
  coachId: string;
  memberPublicUserId: string;
  kind: CoachCheckInKind;
}) {
  const member = await getAuthorizedMember(params.coachId, params.memberPublicUserId);
  const submissions = await prisma.formSubmission.findMany({
    where: { userId: member.id, form: { purpose: purposeByKind[params.kind] } },
    orderBy: [{ checkInDate: "desc" }, { submittedAt: "desc" }],
    include: {
      form: { select: { title: true } },
      answers: {
        include: {
          option: { select: { label: true } },
          question: { select: { prompt: true, order: true, options: { select: { id: true, label: true } } } },
        },
      },
    },
  });

  return {
    member,
    submissions: submissions.map((submission) => ({
      id: submission.id,
      checkInDate: submission.checkInDate,
      submittedAt: submission.submittedAt,
      updatedAt: submission.updatedAt,
      formTitle: submission.form.title,
      answers: submission.answers
        .sort((a, b) => a.question.order - b.question.order)
        .map((answer) => ({ question: answer.question.prompt, value: formatAnswer(answer) })),
    })),
  };
}

export async function getCoachCheckInSubmission(params: {
  coachId: string;
  memberPublicUserId: string;
  submissionId: string;
}) {
  const member = await getAuthorizedMember(params.coachId, params.memberPublicUserId);
  const submission = await prisma.formSubmission.findFirst({
    where: {
      id: params.submissionId,
      userId: member.id,
      form: { purpose: { in: ["DAILY_CHECKIN", "WEEKLY_CHECKIN"] } },
    },
    include: {
      form: { select: { title: true, purpose: true } },
      answers: {
        include: {
          option: { select: { label: true } },
          question: { select: { prompt: true, order: true, options: { select: { id: true, label: true } } } },
        },
      },
    },
  });
  if (!submission) throw new ApiError("체크인 기록을 찾을 수 없습니다.", 404, "CHECKIN_NOT_FOUND");

  return {
    member,
    submission: {
      id: submission.id,
      kind: submission.form.purpose === "DAILY_CHECKIN" ? "daily" : "weekly",
      formTitle: submission.form.title,
      checkInDate: submission.checkInDate,
      submittedAt: submission.submittedAt,
      updatedAt: submission.updatedAt,
      answers: submission.answers
        .sort((a, b) => a.question.order - b.question.order)
        .map((answer) => ({ question: answer.question.prompt, value: formatAnswer(answer) })),
    },
  };
}
