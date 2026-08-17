import type { ProgressStatus } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import {
  canAccessEnrollment,
  materializeEnrollmentExpiry,
  resolveEnrollmentProgressStatus,
} from "@/lib/enrollment-access";
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

const enrollmentInclude = {
  course: {
    include: {
      modules: {
        orderBy: { order: "asc" as const },
        include: {
          lessons: { orderBy: { order: "asc" as const }, select: { id: true, order: true, title: true } },
        },
      },
    },
  },
  progress: true,
} as const;

async function findEnrollmentRecord(userId: string, courseId: string) {
  return prisma.enrollment.findFirst({
    where: {
      userId,
      courseId,
      status: { in: ["ACTIVE", "COMPLETED", "EXPIRED"] },
    },
    include: enrollmentInclude,
  });
}

export async function getEnrollmentAccessState(userId: string, courseId: string) {
  const enrollment = await findEnrollmentRecord(userId, courseId);
  if (!enrollment) {
    return { kind: "none" as const };
  }

  const materialized = await materializeEnrollmentExpiry(enrollment);
  const accessible = canAccessEnrollment(materialized);

  if (accessible) {
    return { kind: "active" as const, enrollment: { ...enrollment, ...materialized } };
  }

  if (materialized.status === "EXPIRED") {
    return { kind: "expired" as const, enrollment: { ...enrollment, ...materialized } };
  }

  return { kind: "blocked" as const, enrollment: { ...enrollment, ...materialized } };
}

export async function getEnrollmentForCourse(userId: string, courseId: string) {
  const state = await getEnrollmentAccessState(userId, courseId);
  if (state.kind !== "active") {
    return null;
  }

  return state.enrollment;
}

export async function getLessonPlayerContext(params: {
  userId: string;
  courseId: string;
  lessonId: string;
}) {
  const state = await getEnrollmentAccessState(params.userId, params.courseId);
  if (state.kind === "none") {
    throw new ApiError("Enrollment not found", 404, "ENROLLMENT_NOT_FOUND");
  }
  if (state.kind === "expired") {
    throw new ApiError("Enrollment access expired", 403, "ENROLLMENT_EXPIRED");
  }
  if (state.kind === "blocked") {
    throw new ApiError("Enrollment not accessible", 403, "ENROLLMENT_BLOCKED");
  }

  const enrollment = state.enrollment;

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
  const now = new Date();
  const accessActive = canAccessEnrollment(enrollment, now);

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      progressPercent,
      lastAccessedAt: now,
      completedAt: progressPercent >= 100 ? enrollment.completedAt ?? now : null,
      status: resolveEnrollmentProgressStatus(
        { progressPercent, completedAt: enrollment.completedAt },
        accessActive,
      ),
    },
  });

  return progressPercent;
}

export async function updateLessonProgress(params: {
  userId: string;
  courseId: string;
  lessonId: string;
  status: ProgressStatus;
}) {
  const enrollment = await getEnrollmentForCourse(params.userId, params.courseId);
  if (!enrollment) {
    const state = await getEnrollmentAccessState(params.userId, params.courseId);
    if (state.kind === "expired") {
      throw new ApiError("Enrollment access expired", 403, "ENROLLMENT_EXPIRED");
    }
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
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: { in: ["ACTIVE", "COMPLETED"] } },
    orderBy: { lastAccessedAt: "desc" },
    include: {
      course: { select: { title: true, thumbnailUrl: true } },
      progress: { where: { status: { in: ["IN_PROGRESS", "COMPLETED"] } } },
    },
  });

  for (const enrollment of enrollments) {
    const materialized = await materializeEnrollmentExpiry(enrollment);
    if (!canAccessEnrollment(materialized)) {
      continue;
    }

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

    if (!nextLesson) {
      continue;
    }

    return {
      courseId: enrollment.courseId,
      courseTitle: enrollment.course.title,
      thumbnailUrl: enrollment.course.thumbnailUrl,
      progressPercent: enrollment.progressPercent,
      lesson: nextLesson,
    };
  }

  return null;
}
