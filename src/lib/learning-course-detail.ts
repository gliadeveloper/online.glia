import type { ProgressStatus } from "@/generated/prisma/client";

import { getEnrollmentAccessState } from "@/lib/learning";
import { prisma } from "@/lib/prisma";

export async function getEnrolledCourseDetail(userId: string, courseId: string) {
  const accessState = await getEnrollmentAccessState(userId, courseId);
  if (accessState.kind === "none") {
    return null;
  }

  const enrollment = accessState.enrollment;

  const course = await prisma.course.findUnique({
    where: { id: enrollment.courseId },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              quiz: { select: { id: true } },
              assignment: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (!course) {
    return null;
  }

  const progressMap = new Map<string, ProgressStatus>(
    enrollment.progress.map((item) => [item.lessonId, item.status as ProgressStatus]),
  );

  const completedCount = enrollment.progress.filter((p) => p.status === "COMPLETED").length;
  const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);

  return {
    accessState: accessState.kind,
    enrollment,
    course,
    progressMap,
    completedCount,
    totalLessons,
    progressPercent: Math.round(enrollment.progressPercent),
  };
}

export type EnrolledCourseDetail = NonNullable<Awaited<ReturnType<typeof getEnrolledCourseDetail>>>;
