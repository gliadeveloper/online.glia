import type { ContentType, LessonType } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export const curriculumInclude = {
  modules: {
    orderBy: { order: "asc" as const },
    include: {
      lessons: {
        orderBy: { order: "asc" as const },
        include: {
          contents: { orderBy: { order: "asc" as const } },
          quiz: {
            select: {
              id: true,
              title: true,
              _count: { select: { questions: true } },
            },
          },
          assignment: { select: { id: true, title: true } },
          _count: { select: { progress: true } },
        },
      },
    },
  },
};

export async function createModule(params: {
  actorId: string;
  courseId: string;
  title: string;
  description?: string;
  order?: number;
}) {
  const maxOrder = await prisma.module.aggregate({
    where: { courseId: params.courseId },
    _max: { order: true },
  });

  const module = await prisma.module.create({
    data: {
      courseId: params.courseId,
      title: params.title.trim(),
      description: params.description?.trim(),
      order: params.order ?? (maxOrder._max.order ?? 0) + 1,
    },
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Module",
    entityId: module.id,
    action: "MODULE_CREATED",
    metadata: { courseId: params.courseId },
  });

  return module;
}

export async function updateModule(params: {
  actorId: string;
  moduleId: string;
  title?: string;
  description?: string;
  order?: number;
}) {
  const module = await prisma.module.update({
    where: { id: params.moduleId },
    data: {
      title: params.title?.trim(),
      description: params.description?.trim(),
      order: params.order,
    },
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Module",
    entityId: module.id,
    action: "MODULE_UPDATED",
  });

  return module;
}

export async function deleteModule(params: { actorId: string; moduleId: string }) {
  const module = await prisma.module.delete({ where: { id: params.moduleId } });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Module",
    entityId: module.id,
    action: "MODULE_DELETED",
  });

  return module;
}

export async function createLesson(params: {
  actorId: string;
  moduleId: string;
  title: string;
  description?: string;
  type?: LessonType;
  duration?: number;
  isFree?: boolean;
}) {
  const maxOrder = await prisma.lesson.aggregate({
    where: { moduleId: params.moduleId },
    _max: { order: true },
  });

  const lesson = await prisma.lesson.create({
    data: {
      moduleId: params.moduleId,
      title: params.title.trim(),
      description: params.description?.trim(),
      type: params.type ?? "VIDEO",
      order: (maxOrder._max.order ?? 0) + 1,
      duration: params.duration,
      isFree: params.isFree ?? false,
    },
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Lesson",
    entityId: lesson.id,
    action: "LESSON_CREATED",
    metadata: { moduleId: params.moduleId },
  });

  return lesson;
}

export async function updateLesson(params: {
  actorId: string;
  lessonId: string;
  title?: string;
  description?: string;
  type?: LessonType;
  duration?: number;
  isFree?: boolean;
  order?: number;
}) {
  const lesson = await prisma.lesson.update({
    where: { id: params.lessonId },
    data: {
      title: params.title?.trim(),
      description: params.description?.trim(),
      type: params.type,
      duration: params.duration,
      isFree: params.isFree,
      order: params.order,
    },
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Lesson",
    entityId: lesson.id,
    action: "LESSON_UPDATED",
  });

  return lesson;
}

export async function deleteLesson(params: { actorId: string; lessonId: string }) {
  const lesson = await prisma.lesson.delete({ where: { id: params.lessonId } });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Lesson",
    entityId: lesson.id,
    action: "LESSON_DELETED",
  });

  return lesson;
}

export async function createContent(params: {
  actorId: string;
  lessonId: string;
  type: ContentType;
  title?: string;
  url?: string;
  body?: string;
  metadata?: import("@/generated/prisma/client").Prisma.InputJsonValue;
}) {
  const maxOrder = await prisma.content.aggregate({
    where: { lessonId: params.lessonId },
    _max: { order: true },
  });

  const content = await prisma.content.create({
    data: {
      lessonId: params.lessonId,
      type: params.type,
      title: params.title?.trim(),
      url: params.url?.trim(),
      body: params.body?.trim(),
      metadata: params.metadata,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Content",
    entityId: content.id,
    action: "CONTENT_CREATED",
    metadata: { lessonId: params.lessonId },
  });

  return content;
}

export async function updateContent(params: {
  actorId: string;
  contentId: string;
  title?: string;
  url?: string;
  body?: string;
  type?: ContentType;
  metadata?: import("@/generated/prisma/client").Prisma.InputJsonValue;
}) {
  const content = await prisma.content.update({
    where: { id: params.contentId },
    data: {
      title: params.title?.trim(),
      url: params.url?.trim(),
      body: params.body?.trim(),
      type: params.type,
      metadata: params.metadata,
    },
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Content",
    entityId: content.id,
    action: "CONTENT_UPDATED",
  });

  return content;
}

export async function deleteContent(params: { actorId: string; contentId: string }) {
  const content = await prisma.content.delete({ where: { id: params.contentId } });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Content",
    entityId: content.id,
    action: "CONTENT_DELETED",
  });

  return content;
}

export async function getCourseCurriculum(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: curriculumInclude,
  });

  if (!course) {
    throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
  }

  return course;
}
