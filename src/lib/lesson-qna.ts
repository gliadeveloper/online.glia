import type { Prisma } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { getEnrollmentAccessState } from "@/lib/learning";
import {
  createLessonQuestionNotification,
  createLessonQuestionReplyNotification,
  markLessonQuestionNotificationRead,
} from "@/lib/home-notifications";
import { normalizeLessonQnaBody, normalizeLessonQnaTitle } from "@/lib/media/lesson-qna-media";
import { prisma } from "@/lib/prisma";
import { displayAuthorName } from "@/lib/post-display";

const QUESTION_TAKE = 100;
const COACH_TAKE = 50;

const authorSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;

type AuthorRow = Prisma.UserGetPayload<{ select: typeof authorSelect }>;

type ReplyRow = {
  id: string;
  body: string;
  isAccepted: boolean;
  upvoteCount: number;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  userId: string;
  user: AuthorRow;
};

type QuestionRow = {
  id: string;
  courseId: string;
  lessonId: string | null;
  title: string;
  body: string;
  isClosed: boolean;
  upvoteCount: number;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  userId: string;
  user: AuthorRow;
  replies: ReplyRow[];
  course: { title: string; instructorId: string | null };
  lesson: { title: string } | null;
};

export type LessonQnaAuthor = {
  id: string;
  name: string;
  isInstructor: boolean;
};

export type LessonQnaReply = {
  id: string;
  body: string;
  isAccepted: boolean;
  upvoteCount: number;
  viewerUpvoted: boolean;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  author: LessonQnaAuthor;
  canEdit: boolean;
  canDelete: boolean;
};

export type LessonQnaQuestion = {
  id: string;
  lessonId: string;
  courseId: string;
  courseTitle: string;
  lessonTitle: string;
  title: string;
  body: string;
  isClosed: boolean;
  upvoteCount: number;
  replyCount: number;
  editedAt: string | null;
  viewerUpvoted: boolean;
  createdAt: string;
  updatedAt: string;
  author: LessonQnaAuthor;
  canEdit: boolean;
  canDelete: boolean;
  canModerate: boolean;
  replies: LessonQnaReply[];
};

const questionInclude = {
  user: { select: authorSelect },
  course: { select: { title: true, instructorId: true } },
  lesson: { select: { title: true } },
  replies: {
    orderBy: [{ isAccepted: "desc" as const }, { upvoteCount: "desc" as const }, { createdAt: "asc" as const }],
    include: {
      user: { select: authorSelect },
    },
  },
} satisfies Prisma.DiscussionInclude;

export async function assertLessonQnaAccess(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      module: {
        select: {
          course: { select: { id: true, title: true, instructorId: true } },
        },
      },
    },
  });

  if (!lesson) {
    throw new ApiError("레슨을 찾을 수 없습니다.", 404, "LESSON_NOT_FOUND");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user) {
    throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED");
  }

  const course = lesson.module.course;
  const isInstructor = course.instructorId === userId;
  const isAdmin = user.role === "ADMIN";

  if (!isInstructor && !isAdmin) {
    const state = await getEnrollmentAccessState(userId, course.id);
    if (state.kind === "expired") {
      throw new ApiError("수강 기간이 끝나 Q&A를 볼 수 없습니다.", 403, "ENROLLMENT_EXPIRED");
    }
    if (state.kind !== "active") {
      throw new ApiError("이 강의 Q&A는 수강생만 볼 수 있습니다.", 403, "FORBIDDEN");
    }
  }

  return {
    lesson,
    course,
    canModerate: isInstructor || isAdmin,
  };
}

function mapAuthor(user: AuthorRow, instructorId: string | null): LessonQnaAuthor {
  return {
    id: user.id,
    name: displayAuthorName(user),
    isInstructor: instructorId === user.id,
  };
}

function mapQuestion(
  row: QuestionRow,
  viewerId: string,
  viewerVotes: { discussionIds: Set<string>; replyIds: Set<string> },
  canModerate: boolean,
): LessonQnaQuestion {
  if (!row.lessonId || !row.lesson) {
    throw new ApiError("레슨 질문을 찾을 수 없습니다.", 404, "NOT_FOUND");
  }

  const instructorId = row.course.instructorId;
  return {
    id: row.id,
    lessonId: row.lessonId,
    courseId: row.courseId,
    courseTitle: row.course.title,
    lessonTitle: row.lesson.title,
    title: row.title,
    body: row.body,
    isClosed: row.isClosed,
    upvoteCount: row.upvoteCount,
    replyCount: row.replies.length,
    editedAt: row.editedAt?.toISOString() ?? null,
    viewerUpvoted: viewerVotes.discussionIds.has(row.id),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: mapAuthor(row.user, instructorId),
    canEdit: row.userId === viewerId,
    canDelete: row.userId === viewerId,
    canModerate,
    replies: row.replies.map((reply) => ({
      id: reply.id,
      body: reply.body,
      isAccepted: reply.isAccepted,
      upvoteCount: reply.upvoteCount,
      viewerUpvoted: viewerVotes.replyIds.has(reply.id),
      createdAt: reply.createdAt.toISOString(),
      updatedAt: reply.updatedAt.toISOString(),
      editedAt: reply.editedAt?.toISOString() ?? null,
      author: mapAuthor(reply.user, instructorId),
      canEdit: reply.userId === viewerId,
      canDelete: reply.userId === viewerId,
    })),
  };
}

async function viewerVoteSets(userId: string, questions: Array<{ id: string; replies: { id: string }[] }>) {
  const discussionIds = questions.map((question) => question.id);
  const replyIds = questions.flatMap((question) => question.replies.map((reply) => reply.id));
  const [discussionVotes, replyVotes] = await Promise.all([
    discussionIds.length
      ? prisma.discussionVote.findMany({
          where: { userId, discussionId: { in: discussionIds } },
          select: { discussionId: true },
        })
      : [],
    replyIds.length
      ? prisma.discussionReplyVote.findMany({
          where: { userId, replyId: { in: replyIds } },
          select: { replyId: true },
        })
      : [],
  ]);

  return {
    discussionIds: new Set(discussionVotes.map((vote) => vote.discussionId)),
    replyIds: new Set(replyVotes.map((vote) => vote.replyId)),
  };
}

export async function listLessonQuestions(userId: string, lessonId: string) {
  const access = await assertLessonQnaAccess(userId, lessonId);
  const rows = await prisma.discussion.findMany({
    where: { lessonId, type: "QUESTION" },
    orderBy: [{ upvoteCount: "desc" }, { createdAt: "desc" }],
    take: QUESTION_TAKE,
    include: questionInclude,
  });
  const votes = await viewerVoteSets(userId, rows);
  return rows.map((row) => mapQuestion(row, userId, votes, access.canModerate));
}

export async function createLessonQuestion(params: {
  userId: string;
  lessonId: string;
  title: string;
  body: string;
}) {
  const access = await assertLessonQnaAccess(params.userId, params.lessonId);
  const title = normalizeLessonQnaTitle(params.title);
  const body = normalizeLessonQnaBody(params.body, access.course.id);
  const occurredAt = new Date();

  const created = await prisma.$transaction(async (tx) => {
    const question = await tx.discussion.create({
      data: {
        courseId: access.course.id,
        lessonId: params.lessonId,
        userId: params.userId,
        type: "QUESTION",
        title,
        body,
      },
    });

    if (access.course.instructorId && access.course.instructorId !== params.userId) {
      await createLessonQuestionNotification(tx, {
        discussionId: question.id,
        userId: access.course.instructorId,
        occurredAt,
      });
    }

    return question;
  });

  return (await listLessonQuestions(params.userId, params.lessonId)).find((item) => item.id === created.id)!;
}

async function requireQuestion(userId: string, lessonId: string, questionId: string) {
  const access = await assertLessonQnaAccess(userId, lessonId);
  const question = await prisma.discussion.findFirst({
    where: { id: questionId, lessonId, type: "QUESTION" },
    select: { id: true, userId: true, isClosed: true, courseId: true },
  });
  if (!question) {
    throw new ApiError("질문을 찾을 수 없습니다.", 404, "NOT_FOUND");
  }
  return { access, question };
}

export async function updateLessonQuestion(params: {
  userId: string;
  lessonId: string;
  questionId: string;
  title?: string;
  body?: string;
  isClosed?: boolean;
}) {
  const { access, question } = await requireQuestion(params.userId, params.lessonId, params.questionId);
  const data: Prisma.DiscussionUpdateInput = {};

  if (params.title !== undefined || params.body !== undefined) {
    if (question.userId !== params.userId) {
      throw new ApiError("본인 질문만 수정할 수 있습니다.", 403, "FORBIDDEN");
    }
    if (params.title !== undefined) data.title = normalizeLessonQnaTitle(params.title);
    if (params.body !== undefined) data.body = normalizeLessonQnaBody(params.body, access.course.id);
    data.editedAt = new Date();
  }

  if (params.isClosed !== undefined) {
    if (!access.canModerate) {
      throw new ApiError("질문을 닫을 권한이 없습니다.", 403, "FORBIDDEN");
    }
    if (!params.isClosed) {
      throw new ApiError("닫힌 질문은 다시 열 수 없습니다.", 400, "VALIDATION_ERROR");
    }
    data.isClosed = true;
  }

  if (Object.keys(data).length === 0) {
    throw new ApiError("수정할 내용이 없습니다.", 400, "VALIDATION_ERROR");
  }

  await prisma.discussion.update({ where: { id: question.id }, data });
  return (await listLessonQuestions(params.userId, params.lessonId)).find((item) => item.id === question.id)!;
}

export async function deleteLessonQuestion(params: {
  userId: string;
  lessonId: string;
  questionId: string;
}) {
  const { question } = await requireQuestion(params.userId, params.lessonId, params.questionId);
  if (question.userId !== params.userId) {
    throw new ApiError("본인 질문만 삭제할 수 있습니다.", 403, "FORBIDDEN");
  }
  await prisma.discussion.delete({ where: { id: question.id } });
}

export async function createLessonReply(params: {
  userId: string;
  lessonId: string;
  questionId: string;
  body: string;
}) {
  const { access, question } = await requireQuestion(params.userId, params.lessonId, params.questionId);
  if (question.isClosed) {
    throw new ApiError("닫힌 질문에는 답변을 달 수 없습니다.", 400, "QUESTION_CLOSED");
  }

  const body = normalizeLessonQnaBody(params.body, access.course.id);
  if (!body) {
    throw new ApiError("답변을 입력해 주세요.", 400, "VALIDATION_ERROR");
  }

  const occurredAt = new Date();
  const reply = await prisma.$transaction(async (tx) => {
    const created = await tx.discussionReply.create({
      data: {
        discussionId: question.id,
        userId: params.userId,
        body,
      },
    });

    if (question.userId !== params.userId) {
      await createLessonQuestionReplyNotification(tx, {
        replyId: created.id,
        userId: question.userId,
        occurredAt,
      });
    }

    return created;
  });

  const listed = await listLessonQuestions(params.userId, params.lessonId);
  const parent = listed.find((item) => item.id === question.id);
  return parent?.replies.find((item) => item.id === reply.id) ?? null;
}

export async function updateLessonReply(params: {
  userId: string;
  lessonId: string;
  questionId: string;
  replyId: string;
  body: string;
}) {
  const { access } = await requireQuestion(params.userId, params.lessonId, params.questionId);
  const reply = await prisma.discussionReply.findFirst({
    where: { id: params.replyId, discussionId: params.questionId },
  });
  if (!reply) {
    throw new ApiError("답변을 찾을 수 없습니다.", 404, "NOT_FOUND");
  }
  if (reply.userId !== params.userId) {
    throw new ApiError("본인 답변만 수정할 수 있습니다.", 403, "FORBIDDEN");
  }

  const body = normalizeLessonQnaBody(params.body, access.course.id);
  if (!body) {
    throw new ApiError("답변을 입력해 주세요.", 400, "VALIDATION_ERROR");
  }

  await prisma.discussionReply.update({
    where: { id: reply.id },
    data: { body, editedAt: new Date() },
  });
  const listed = await listLessonQuestions(params.userId, params.lessonId);
  return listed.find((item) => item.id === params.questionId)?.replies.find((item) => item.id === reply.id) ?? null;
}

export async function deleteLessonReply(params: {
  userId: string;
  lessonId: string;
  questionId: string;
  replyId: string;
}) {
  await requireQuestion(params.userId, params.lessonId, params.questionId);
  const reply = await prisma.discussionReply.findFirst({
    where: { id: params.replyId, discussionId: params.questionId },
  });
  if (!reply) {
    throw new ApiError("답변을 찾을 수 없습니다.", 404, "NOT_FOUND");
  }
  if (reply.userId !== params.userId) {
    throw new ApiError("본인 답변만 삭제할 수 있습니다.", 403, "FORBIDDEN");
  }
  await prisma.discussionReply.delete({ where: { id: reply.id } });
}

export async function toggleQuestionUpvote(params: {
  userId: string;
  lessonId: string;
  questionId: string;
}) {
  await requireQuestion(params.userId, params.lessonId, params.questionId);
  await prisma.$transaction(async (tx) => {
    const existing = await tx.discussionVote.findUnique({
      where: { discussionId_userId: { discussionId: params.questionId, userId: params.userId } },
    });
    if (existing) {
      await tx.discussionVote.delete({ where: { id: existing.id } });
      await tx.discussion.update({
        where: { id: params.questionId },
        data: { upvoteCount: { decrement: 1 } },
      });
      return;
    }
    await tx.discussionVote.create({
      data: { discussionId: params.questionId, userId: params.userId },
    });
    await tx.discussion.update({
      where: { id: params.questionId },
      data: { upvoteCount: { increment: 1 } },
    });
  });
  return (await listLessonQuestions(params.userId, params.lessonId)).find((item) => item.id === params.questionId)!;
}

export async function toggleReplyUpvote(params: {
  userId: string;
  lessonId: string;
  questionId: string;
  replyId: string;
}) {
  await requireQuestion(params.userId, params.lessonId, params.questionId);
  const reply = await prisma.discussionReply.findFirst({
    where: { id: params.replyId, discussionId: params.questionId },
    select: { id: true },
  });
  if (!reply) {
    throw new ApiError("답변을 찾을 수 없습니다.", 404, "NOT_FOUND");
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.discussionReplyVote.findUnique({
      where: { replyId_userId: { replyId: reply.id, userId: params.userId } },
    });
    if (existing) {
      await tx.discussionReplyVote.delete({ where: { id: existing.id } });
      await tx.discussionReply.update({
        where: { id: reply.id },
        data: { upvoteCount: { decrement: 1 } },
      });
      return;
    }
    await tx.discussionReplyVote.create({ data: { replyId: reply.id, userId: params.userId } });
    await tx.discussionReply.update({
      where: { id: reply.id },
      data: { upvoteCount: { increment: 1 } },
    });
  });

  return (await listLessonQuestions(params.userId, params.lessonId)).find((item) => item.id === params.questionId)!;
}

export async function acceptLessonReply(params: {
  userId: string;
  lessonId: string;
  questionId: string;
  replyId: string;
}) {
  const { access } = await requireQuestion(params.userId, params.lessonId, params.questionId);
  if (!access.canModerate) {
    throw new ApiError("답변을 채택할 권한이 없습니다.", 403, "FORBIDDEN");
  }

  const reply = await prisma.discussionReply.findFirst({
    where: { id: params.replyId, discussionId: params.questionId },
  });
  if (!reply) {
    throw new ApiError("답변을 찾을 수 없습니다.", 404, "NOT_FOUND");
  }

  await prisma.$transaction(async (tx) => {
    if (reply.isAccepted) {
      await tx.discussionReply.update({ where: { id: reply.id }, data: { isAccepted: false } });
      return;
    }
    await tx.discussionReply.updateMany({
      where: { discussionId: params.questionId },
      data: { isAccepted: false },
    });
    await tx.discussionReply.update({ where: { id: reply.id }, data: { isAccepted: true } });
  });

  return (await listLessonQuestions(params.userId, params.lessonId)).find((item) => item.id === params.questionId)!;
}

function unansweredWhere(instructorId: string): Prisma.DiscussionWhereInput {
  return {
    type: "QUESTION",
    lessonId: { not: null },
    isClosed: false,
    course: { instructorId },
    replies: { none: { userId: instructorId } },
  };
}

export async function markOwnedLessonQuestionRead(instructorId: string, questionId: string) {
  const question = await prisma.discussion.findFirst({
    where: { id: questionId, type: "QUESTION", course: { instructorId } },
    select: { id: true },
  });
  if (!question) {
    throw new ApiError("질문을 찾을 수 없습니다.", 404, "NOT_FOUND");
  }
  await markLessonQuestionNotificationRead(instructorId, question.id);
}

export async function countCoachUnansweredLessonQuestions(instructorId: string) {
  return prisma.discussion.count({ where: unansweredWhere(instructorId) });
}

export async function listCoachLessonQuestions(params: {
  instructorId: string;
  filter: "open" | "all";
}) {
  const rows = await prisma.discussion.findMany({
    where:
      params.filter === "open"
        ? unansweredWhere(params.instructorId)
        : {
            type: "QUESTION",
            lessonId: { not: null },
            course: { instructorId: params.instructorId },
          },
    orderBy: [{ createdAt: "desc" }],
    take: COACH_TAKE,
    include: questionInclude,
  });
  const votes = await viewerVoteSets(params.instructorId, rows);
  return rows.map((row) => mapQuestion(row, params.instructorId, votes, true));
}
