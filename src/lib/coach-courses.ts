import type { CourseLevel, CourseStatus, Prisma } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { courseInclude, updateCourse, updateCourseStatus } from "@/lib/courses";
import { getCourseCurriculum } from "@/lib/curriculum-admin";
import { prisma } from "@/lib/prisma";

import { buildCoursePublishChecklist } from "./course-publish-checklist";

export { buildCoursePublishChecklist };

export async function assertCoachOwnsCourse(coachId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, instructorId: true, title: true, status: true },
  });

  if (!course) {
    throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
  }

  if (course.instructorId !== coachId) {
    throw new ApiError("Course access denied", 403, "FORBIDDEN");
  }

  return course;
}

export async function assertCoachOwnsLesson(coachId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      module: {
        select: {
          courseId: true,
          course: { select: { instructorId: true, title: true } },
        },
      },
    },
  });

  if (!lesson) {
    throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
  }

  if (lesson.module.course.instructorId !== coachId) {
    throw new ApiError("Lesson access denied", 403, "FORBIDDEN");
  }

  return lesson;
}

export async function assertCoachOwnsModule(coachId: string, moduleId: string) {
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    select: {
      id: true,
      courseId: true,
      course: { select: { instructorId: true } },
    },
  });

  if (!module) {
    throw new ApiError("Module not found", 404, "MODULE_NOT_FOUND");
  }

  if (module.course.instructorId !== coachId) {
    throw new ApiError("Module access denied", 403, "FORBIDDEN");
  }

  return module;
}

export async function assertCoachOwnsContent(coachId: string, contentId: string) {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: {
      id: true,
      lesson: {
        select: {
          id: true,
          module: {
            select: {
              courseId: true,
              course: { select: { instructorId: true } },
            },
          },
        },
      },
    },
  });

  if (!content) {
    throw new ApiError("Content not found", 404, "CONTENT_NOT_FOUND");
  }

  if (content.lesson.module.course.instructorId !== coachId) {
    throw new ApiError("Content access denied", 403, "FORBIDDEN");
  }

  return content;
}

export async function listCoachCourses(coachId: string) {
  return prisma.course.findMany({
    where: { instructorId: coachId },
    include: courseInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function createCoachCourse(params: {
  coachId: string;
  title: string;
  description?: string;
  level?: CourseLevel;
  thumbnailUrl?: string;
}) {
  const course = await prisma.course.create({
    data: {
      title: params.title.trim(),
      description: params.description?.trim(),
      instructorId: params.coachId,
      level: params.level ?? "ALL_LEVELS",
      thumbnailUrl: params.thumbnailUrl?.trim(),
      status: "DRAFT",
    },
    include: courseInclude,
  });

  await writeAuditLog({
    actorId: params.coachId,
    entityType: "Course",
    entityId: course.id,
    action: "COURSE_CREATED",
    metadata: { courseId: course.id, source: "coach_portal" },
  });

  return course;
}

export async function getCoachCourseDetail(coachId: string, courseId: string) {
  await assertCoachOwnsCourse(coachId, courseId);
  return getCourseCurriculum(courseId);
}

export async function updateCoachCourse(params: {
  coachId: string;
  courseId: string;
  title?: string;
  description?: string;
  level?: CourseLevel;
  thumbnailUrl?: string;
}) {
  await assertCoachOwnsCourse(params.coachId, params.courseId);

  return updateCourse({
    actorId: params.coachId,
    courseId: params.courseId,
    title: params.title,
    description: params.description,
    level: params.level,
    thumbnailUrl: params.thumbnailUrl,
  });
}

export async function publishCoachCourse(params: { coachId: string; courseId: string }) {
  await assertCoachOwnsCourse(params.coachId, params.courseId);

  const course = await getCourseCurriculum(params.courseId);
  const checklist = buildCoursePublishChecklist(course);

  if (!checklist.ready) {
    throw new ApiError("Course is not ready to publish", 400, "PUBLISH_CHECKLIST_FAILED");
  }

  return updateCourseStatus({
    actorId: params.coachId,
    courseId: params.courseId,
    action: "publish",
  });
}

export async function archiveCoachCourse(params: { coachId: string; courseId: string }) {
  await assertCoachOwnsCourse(params.coachId, params.courseId);

  return updateCourseStatus({
    actorId: params.coachId,
    courseId: params.courseId,
    action: "archive",
  });
}

export type CoachCourseSummary = {
  id: string;
  title: string;
  status: CourseStatus;
  moduleCount: number;
  lessonCount: number;
  updatedAt: Date;
};

export async function summarizeCoachCourses(coachId: string): Promise<CoachCourseSummary[]> {
  const courses = await prisma.course.findMany({
    where: { instructorId: coachId },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      modules: {
        select: {
          _count: { select: { lessons: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    status: course.status,
    updatedAt: course.updatedAt,
    moduleCount: course.modules.length,
    lessonCount: course.modules.reduce((sum, module) => sum + module._count.lessons, 0),
  }));
}

export function metadataInput(value: Prisma.InputJsonValue | undefined) {
  return value === undefined ? undefined : value;
}
