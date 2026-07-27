import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export const lessonDetailInclude = {
  module: {
    select: {
      id: true,
      title: true,
      courseId: true,
      course: { select: { id: true, title: true, slug: true } },
    },
  },
  contents: { orderBy: { order: "asc" as const } },
  quiz: {
    include: {
      questions: {
        orderBy: { order: "asc" as const },
        include: { options: { orderBy: { order: "asc" as const } } },
      },
    },
  },
  assignment: true,
};

export async function upsertQuiz(params: {
  actorId: string;
  lessonId: string;
  title: string;
  description?: string;
  passingScore?: number;
  timeLimitMinutes?: number | null;
  questions?: Array<{
    prompt: string;
    order: number;
    options: Array<{ label: string; order: number; isCorrect?: boolean }>;
  }>;
}) {
  const lesson = await prisma.lesson.findUnique({ where: { id: params.lessonId } });
  if (!lesson) {
    throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
  }

  if (lesson.type !== "QUIZ") {
    await prisma.lesson.update({ where: { id: params.lessonId }, data: { type: "QUIZ" } });
  }

  const quiz = await prisma.$transaction(async (tx) => {
    const existing = await tx.quiz.findUnique({ where: { lessonId: params.lessonId } });

    const record = existing
      ? await tx.quiz.update({
          where: { id: existing.id },
          data: {
            title: params.title.trim(),
            description: params.description?.trim(),
            passingScore: params.passingScore ?? existing.passingScore,
            timeLimitMinutes: params.timeLimitMinutes,
          },
        })
      : await tx.quiz.create({
          data: {
            lessonId: params.lessonId,
            title: params.title.trim(),
            description: params.description?.trim(),
            passingScore: params.passingScore ?? 70,
            timeLimitMinutes: params.timeLimitMinutes,
          },
        });

    if (params.questions?.length) {
      await tx.question.deleteMany({ where: { quizId: record.id } });
      for (const question of params.questions) {
        await tx.question.create({
          data: {
            quizId: record.id,
            prompt: question.prompt.trim(),
            order: question.order,
            options: {
              create: question.options.map((option) => ({
                label: option.label.trim(),
                order: option.order,
                isCorrect: option.isCorrect ?? false,
              })),
            },
          },
        });
      }
    }

    return tx.quiz.findUniqueOrThrow({
      where: { id: record.id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { options: { orderBy: { order: "asc" } } },
        },
      },
    });
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Quiz",
    entityId: quiz.id,
    action: "QUIZ_UPSERTED",
    metadata: { lessonId: params.lessonId },
  });

  return quiz;
}

export async function upsertAssignment(params: {
  actorId: string;
  lessonId: string;
  title: string;
  description?: string;
  maxScore?: number;
  dueDate?: Date | null;
}) {
  const lesson = await prisma.lesson.findUnique({ where: { id: params.lessonId } });
  if (!lesson) {
    throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
  }

  if (lesson.type !== "ASSIGNMENT") {
    await prisma.lesson.update({ where: { id: params.lessonId }, data: { type: "ASSIGNMENT" } });
  }

  const assignment = await prisma.assignment.upsert({
    where: { lessonId: params.lessonId },
    update: {
      title: params.title.trim(),
      description: params.description?.trim(),
      maxScore: params.maxScore,
      dueDate: params.dueDate,
    },
    create: {
      lessonId: params.lessonId,
      title: params.title.trim(),
      description: params.description?.trim(),
      maxScore: params.maxScore ?? 100,
      dueDate: params.dueDate,
    },
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Assignment",
    entityId: assignment.id,
    action: "ASSIGNMENT_UPSERTED",
    metadata: { lessonId: params.lessonId },
  });

  return assignment;
}

export async function getLessonDetail(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: lessonDetailInclude,
  });

  if (!lesson) {
    throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
  }

  return lesson;
}
