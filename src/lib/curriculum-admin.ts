import type { ContentType, LessonType, PrismaClient } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { normalizeBlockNoteWrite } from "@/lib/media/normalize-blocknote";
import { assertBodyVersion, assertMediaEditor, lockContentForMedia, lockLessonForMedia, removeMediaUsages, syncMediaUsages, withMediaTransaction } from "@/lib/media/usage-sync";

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

  const courseModule = await prisma.module.create({
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
    entityId: courseModule.id,
    action: "MODULE_CREATED",
    metadata: { courseId: params.courseId },
  });

  return courseModule;
}

export async function updateModule(params: {
  actorId: string;
  moduleId: string;
  title?: string;
  description?: string;
  order?: number;
}) {
  const courseModule = await prisma.module.update({
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
    entityId: courseModule.id,
    action: "MODULE_UPDATED",
  });

  return courseModule;
}

export async function deleteModule(params: { actorId: string; moduleId: string }, db: PrismaClient = prisma) {
  return withMediaTransaction(db, async (tx) => {
    await tx.$queryRaw`SELECT id FROM modules WHERE id = ${params.moduleId} FOR UPDATE`;
    const courseModule = await tx.module.findUnique({ where: { id: params.moduleId }, include: { course: { select: { instructorId: true } } } });
    if (!courseModule) throw new ApiError("Module not found", 404, "MODULE_NOT_FOUND");
    await assertMediaEditor(tx, params.actorId, courseModule.course.instructorId);
    await tx.$queryRaw`SELECT id FROM lessons WHERE "moduleId" = ${courseModule.id} ORDER BY id FOR UPDATE`;
    const contents = await tx.$queryRaw<{ id: string }[]>`
      SELECT c.id FROM contents c JOIN lessons l ON l.id = c."lessonId"
      WHERE l."moduleId" = ${courseModule.id} ORDER BY c.id FOR UPDATE OF c`;
    await removeMediaUsages(tx, contents.map(c => ({ contentId: c.id })), params.actorId);
    const deleted = await tx.module.delete({ where: { id: courseModule.id } });
    await writeAuditLog({ actorId: params.actorId, entityType: "Module", entityId: courseModule.id, action: "MODULE_DELETED" }, tx);
    return deleted;
  });
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

export async function deleteLesson(params: { actorId: string; lessonId: string }, db: PrismaClient = prisma) {
  return withMediaTransaction(db, async (tx) => {
    const lesson = await lockLessonForMedia(tx, params.lessonId, params.actorId, true);
    const contents = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM contents WHERE "lessonId" = ${lesson.id} ORDER BY id FOR UPDATE`;
    await removeMediaUsages(tx, contents.map(c => ({ contentId: c.id })), params.actorId);
    const deleted = await tx.lesson.delete({ where: { id: lesson.id } });
    await writeAuditLog({ actorId: params.actorId, entityType: "Lesson", entityId: lesson.id, action: "LESSON_DELETED" }, tx);
    return deleted;
  });
}

export async function createContent(params: {
  actorId: string;
  lessonId: string;
  type: ContentType;
  title?: string;
  url?: string;
  body?: string;
  metadata?: Prisma.InputJsonValue | null;
}, db: PrismaClient = prisma) {
  return withMediaTransaction(db, async (tx) => {
    await lockLessonForMedia(tx, params.lessonId, params.actorId, true);
    const normalized = await normalizeBlockNoteWrite({ body: params.body, metadata: params.metadata });
    const maxOrder = await tx.content.aggregate({ where: { lessonId: params.lessonId }, _max: { order: true } });
    const content = await tx.content.create({ data: {
      lessonId: params.lessonId, type: params.type, title: params.title?.trim(),
      url: params.url?.trim(), body: normalized.body?.trim(),
      metadata: normalized.metadata === null ? Prisma.JsonNull : normalized.metadata,
      order: (maxOrder._max.order ?? 0) + 1,
    } });
    await syncMediaUsages(tx, { actorId: params.actorId, target: { contentId: content.id }, before: {}, after: content });
    await writeAuditLog({ actorId: params.actorId, entityType: "Content", entityId: content.id, action: "CONTENT_CREATED", metadata: { lessonId: params.lessonId } }, tx);
    return content;
  });
}

export async function updateContent(params: {
  actorId: string;
  contentId: string;
  title?: string;
  url?: string;
  body?: string;
  type?: ContentType;
  metadata?: Prisma.InputJsonValue | null;
  expectedBodyVersion?: string;
}, db: PrismaClient = prisma) {
  return withMediaTransaction(db, async (tx) => {
    const existing = await lockContentForMedia(tx, params.contentId, params.actorId);
    if (params.body !== undefined || params.metadata !== undefined || params.url !== undefined || params.type !== undefined) {
      await assertBodyVersion(existing, params.expectedBodyVersion);
    }
    const normalized = await normalizeBlockNoteWrite({ body: params.body, metadata: params.metadata }, existing.metadata);
    const content = await tx.content.update({ where: { id: existing.id }, data: {
      title: params.title?.trim(), url: params.url?.trim(), body: normalized.body?.trim(), type: params.type,
      metadata: normalized.metadata === null ? Prisma.JsonNull : normalized.metadata,
    } });
    await syncMediaUsages(tx, { actorId: params.actorId, target: { contentId: content.id }, before: existing, after: content });
    await writeAuditLog({ actorId: params.actorId, entityType: "Content", entityId: content.id, action: "CONTENT_UPDATED" }, tx);
    return content;
  });
}

export async function deleteContent(params: { actorId: string; contentId: string }, db: PrismaClient = prisma) {
  return withMediaTransaction(db, async (tx) => {
    const content = await lockContentForMedia(tx, params.contentId, params.actorId);
    await removeMediaUsages(tx, [{ contentId: content.id }], params.actorId);
    const deleted = await tx.content.delete({ where: { id: content.id } });
    await writeAuditLog({ actorId: params.actorId, entityType: "Content", entityId: content.id, action: "CONTENT_DELETED" }, tx);
    return deleted;
  });
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
