import type { CourseLevel, CourseStatus } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { courseLevelLabels, courseStatusLabels } from "@/lib/course-labels";
import { prisma } from "@/lib/prisma";

export { courseLevelLabels, courseStatusLabels };

export const courseInclude = {
  instructor: { select: { id: true, name: true, email: true } },
  organization: { select: { id: true, name: true, slug: true } },
  _count: {
    select: {
      modules: true,
      enrollments: true,
      productItems: true,
    },
  },
  modules: {
    orderBy: { order: "asc" as const },
    include: {
      _count: { select: { lessons: true } },
    },
  },
};

export async function createCourse(params: {
  actorId: string;
  title: string;
  description?: string;
  instructorId: string;
  organizationId?: string;
  level?: CourseLevel;
  thumbnailUrl?: string;
  publish?: boolean;
}) {
  const course = await prisma.course.create({
    data: {
      title: params.title.trim(),
      description: params.description?.trim(),
      instructorId: params.instructorId,
      organizationId: params.organizationId,
      level: params.level ?? "ALL_LEVELS",
      thumbnailUrl: params.thumbnailUrl?.trim(),
      status: params.publish ? "PUBLISHED" : "DRAFT",
      publishedAt: params.publish ? new Date() : null,
    },
    include: courseInclude,
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Course",
    entityId: course.id,
    action: "COURSE_CREATED",
    metadata: { courseId: course.id },
  });

  return course;
}

export async function updateCourseStatus(params: {
  actorId: string;
  courseId: string;
  action: "publish" | "archive";
}) {
  const existing = await prisma.course.findUnique({ where: { id: params.courseId } });
  if (!existing) {
    throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
  }

  const course = await prisma.course.update({
    where: { id: params.courseId },
    data:
      params.action === "publish"
        ? { status: "PUBLISHED", publishedAt: new Date() }
        : { status: "ARCHIVED" },
    include: courseInclude,
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Course",
    entityId: course.id,
    action: params.action === "publish" ? "COURSE_PUBLISHED" : "COURSE_ARCHIVED",
    metadata: { courseId: course.id },
  });

  return course;
}

export async function updateCourse(params: {
  actorId: string;
  courseId: string;
  title?: string;
  description?: string;
  level?: CourseLevel;
  thumbnailUrl?: string;
  isFeatured?: boolean;
}) {
  const course = await prisma.course.update({
    where: { id: params.courseId },
    data: {
      title: params.title?.trim(),
      description: params.description?.trim(),
      level: params.level,
      thumbnailUrl: params.thumbnailUrl?.trim(),
      isFeatured: params.isFeatured,
    },
    include: courseInclude,
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Course",
    entityId: course.id,
    action: "COURSE_UPDATED",
    metadata: { courseId: course.id },
  });

  return course;
}
