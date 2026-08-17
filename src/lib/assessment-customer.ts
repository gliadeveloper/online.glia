import { ApiError } from "@/lib/api";
import { updateLessonProgress } from "@/lib/learning";
import { prisma } from "@/lib/prisma";

export async function submitQuizAttempt(params: {
  userId: string;
  courseId: string;
  quizId: string;
  answers: Array<{ questionId: string; optionId: string }>;
}) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.quizId },
    include: {
      lesson: {
        include: { module: { select: { course: { select: { id: true } } } } },
      },
      questions: {
        include: { options: true },
      },
    },
  });

  if (!quiz) {
    throw new ApiError("Quiz not found", 404, "QUIZ_NOT_FOUND");
  }

  if (quiz.lesson.module.course.id !== params.courseId) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  let earned = 0;
  let totalPoints = 0;

  for (const question of quiz.questions) {
    totalPoints += question.points;
    const answer = params.answers.find((item) => item.questionId === question.id);
    const selected = question.options.find((option) => option.id === answer?.optionId);
    if (selected?.isCorrect) {
      earned += question.points;
    }
  }

  const score = totalPoints > 0 ? (earned / totalPoints) * 100 : 0;
  const isPassed = score >= quiz.passingScore;

  const attempt = await prisma.$transaction(async (tx) => {
    const record = await tx.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId: params.userId,
        score,
        isPassed,
        submittedAt: new Date(),
        answers: {
          create: params.answers.map((answer) => ({
            questionId: answer.questionId,
            optionIds: [answer.optionId],
          })),
        },
      },
      include: {
        answers: true,
      },
    });

    return record;
  });

  if (isPassed) {
    await updateLessonProgress({
      userId: params.userId,
      courseId: params.courseId,
      lessonId: quiz.lessonId,
      status: "COMPLETED",
    });
  } else {
    await updateLessonProgress({
      userId: params.userId,
      courseId: params.courseId,
      lessonId: quiz.lessonId,
      status: "IN_PROGRESS",
    });
  }

  return {
    attempt,
    score,
    isPassed,
    passingScore: quiz.passingScore,
    correctCount: quiz.questions.filter((question) => {
      const answer = params.answers.find((item) => item.questionId === question.id);
      return question.options.some((option) => option.id === answer?.optionId && option.isCorrect);
    }).length,
    totalQuestions: quiz.questions.length,
  };
}

export async function submitAssignment(params: {
  userId: string;
  courseId: string;
  assignmentId: string;
  content: string;
}) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: params.assignmentId },
    include: {
      lesson: {
        include: { module: { select: { course: { select: { id: true } } } } },
      },
    },
  });

  if (!assignment) {
    throw new ApiError("Assignment not found", 404, "ASSIGNMENT_NOT_FOUND");
  }

  if (assignment.lesson.module.course.id !== params.courseId) {
    throw new ApiError("Forbidden", 403, "FORBIDDEN");
  }

  if (!params.content.trim()) {
    throw new ApiError("content is required", 400, "VALIDATION_ERROR");
  }

  const existing = await prisma.submission.findFirst({
    where: { assignmentId: assignment.id, userId: params.userId },
    orderBy: { updatedAt: "desc" },
  });

  const submission = existing
    ? await prisma.submission.update({
        where: { id: existing.id },
        data: {
          content: params.content.trim(),
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      })
    : await prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          userId: params.userId,
          content: params.content.trim(),
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });

  await updateLessonProgress({
    userId: params.userId,
      courseId: params.courseId,
    lessonId: assignment.lessonId,
    status: "COMPLETED",
  });

  return submission;
}
