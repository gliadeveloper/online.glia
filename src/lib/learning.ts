import type { ProgressStatus } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const lessonPlayerInclude = {
  module: {
    select: {
      id: true,
      title: true,
      order: true,
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          thumbnailUrl: true,
        },
      },
    },
  },
  contents: { orderBy: { order: "asc" as const } },
  quiz: {
    include: {
      questions: {
        orderBy: { order: "asc" as const },
        include: {
          options: {
            orderBy: { order: "asc" as const },
            select: { id: true, label: true, order: true },
          },
        },
      },
    },
  },
  assignment: true,
};

export async function getEnrollmentForCourse(userId: string, courseSlug: string) {
  return prisma.enrollment.findFirst({
    where: {
      userId,
      course: { slug: courseSlug },
      status: "ACTIVE",
    },
    include: {
      course: {
        include: {
          modules: {
            orderBy: { order: "asc" },
            include: {
              lessons: { orderBy: { order: "asc" }, select: { id: true, order: true, title: true } },
            },
          },
        },
      },
      progress: true,
    },
  });
}

export async function getLessonPlayerContext(params: {
  userId: string;
  courseSlug: string;
  lessonId: string;
}) {
  const enrollment = await getEnrollmentForCourse(params.userId, params.courseSlug);
  if (!enrollment) {
    throw new ApiError("Enrollment not found", 404, "ENROLLMENT_NOT_FOUND");
  }

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: params.lessonId,
      module: { courseId: enrollment.courseId },
    },
    include: lessonPlayerInclude,
  });

  if (!lesson) {
    throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
  }

  const progress = enrollment.progress.find((item) => item.lessonId === lesson.id);

  const allLessons = enrollment.course.modules.flatMap((module) =>
    module.lessons.map((item) => ({ ...item, moduleOrder: module.order })),
  );
  const currentIndex = allLessons.findIndex((item) => item.id === lesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null;

  let quizAttempt = null;
  if (lesson.quiz) {
    quizAttempt = await prisma.quizAttempt.findFirst({
      where: { quizId: lesson.quiz.id, userId: params.userId },
      orderBy: { startedAt: "desc" },
      include: {
        answers: {
          include: {
            question: { select: { id: true, prompt: true } },
          },
        },
      },
    });
  }

  let assignmentSubmission = null;
  if (lesson.assignment) {
    assignmentSubmission = await prisma.submission.findFirst({
      where: {
        assignmentId: lesson.assignment.id,
        userId: params.userId,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  return {
    enrollment,
    lesson,
    progress: progress ?? null,
    prevLesson,
    nextLesson,
    quizAttempt,
    assignmentSubmission,
  };
}

async function recalculateEnrollmentProgress(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    include: {
      course: {
        include: {
          modules: {
            include: { _count: { select: { lessons: true } } },
          },
        },
      },
      progress: { where: { status: "COMPLETED" } },
    },
  });

  const totalLessons = enrollment.course.modules.reduce(
    (sum, module) => sum + module._count.lessons,
    0,
  );
  const completedLessons = enrollment.progress.length;
  const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      progressPercent,
      lastAccessedAt: new Date(),
      completedAt: progressPercent >= 100 ? new Date() : null,
      status: progressPercent >= 100 ? "COMPLETED" : "ACTIVE",
    },
  });

  return progressPercent;
}

export async function updateLessonProgress(params: {
  userId: string;
  courseSlug: string;
  lessonId: string;
  status: ProgressStatus;
}) {
  const enrollment = await getEnrollmentForCourse(params.userId, params.courseSlug);
  if (!enrollment) {
    throw new ApiError("Enrollment not found", 404, "ENROLLMENT_NOT_FOUND");
  }

  const lesson = await prisma.lesson.findFirst({
    where: { id: params.lessonId, module: { courseId: enrollment.courseId } },
  });
  if (!lesson) {
    throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
  }

  const progress = await prisma.lessonProgress.upsert({
    where: {
      enrollmentId_lessonId: {
        enrollmentId: enrollment.id,
        lessonId: params.lessonId,
      },
    },
    update: {
      status: params.status,
      completedAt: params.status === "COMPLETED" ? new Date() : null,
    },
    create: {
      enrollmentId: enrollment.id,
      lessonId: params.lessonId,
      status: params.status,
      completedAt: params.status === "COMPLETED" ? new Date() : null,
    },
  });

  const progressPercent = await recalculateEnrollmentProgress(enrollment.id);

  return { progress, progressPercent };
}

export async function getContinueLearning(userId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, status: { in: ["ACTIVE", "COMPLETED"] } },
    orderBy: { lastAccessedAt: "desc" },
    include: {
      course: { select: { slug: true, title: true, thumbnailUrl: true } },
      progress: { where: { status: { in: ["IN_PROGRESS", "COMPLETED"] } } },
    },
  });

  if (!enrollment) return null;

  const completedIds = new Set(
    enrollment.progress.filter((p) => p.status === "COMPLETED").map((p) => p.lessonId),
  );

  const nextLesson = await prisma.lesson.findFirst({
    where: {
      module: { courseId: enrollment.courseId },
      id: { notIn: [...completedIds] },
    },
    orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
    select: {
      id: true,
      title: true,
      type: true,
      module: { select: { title: true } },
    },
  });

  if (!nextLesson) return null;

  return {
    courseSlug: enrollment.course.slug,
    courseTitle: enrollment.course.title,
    thumbnailUrl: enrollment.course.thumbnailUrl,
    progressPercent: enrollment.progressPercent,
    lesson: nextLesson,
  };
}
