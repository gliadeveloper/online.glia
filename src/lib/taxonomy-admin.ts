import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { courses: true, children: true } },
      parent: { select: { id: true, name: true } },
    },
  });
}

export async function createCategory(params: {
  actorId: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
}) {
  const category = await prisma.category.create({
    data: {
      name: params.name.trim(),
      slug: params.slug.trim(),
      description: params.description?.trim(),
      parentId: params.parentId,
    },
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Category",
    entityId: category.id,
    action: "CATEGORY_CREATED",
  });

  return category;
}

export async function listTags() {
  return prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true } } },
  });
}

export async function createTag(params: {
  actorId: string;
  name: string;
  slug: string;
}) {
  const tag = await prisma.tag.create({
    data: {
      name: params.name.trim(),
      slug: params.slug.trim(),
    },
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Tag",
    entityId: tag.id,
    action: "TAG_CREATED",
  });

  return tag;
}

export async function setCourseTaxonomy(params: {
  actorId: string;
  courseId: string;
  categoryIds?: string[];
  tagIds?: string[];
}) {
  const course = await prisma.course.findUnique({ where: { id: params.courseId } });
  if (!course) {
    throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
  }

  await prisma.$transaction(async (tx) => {
    if (params.categoryIds !== undefined) {
      await tx.courseCategory.deleteMany({ where: { courseId: params.courseId } });
      if (params.categoryIds.length) {
        await tx.courseCategory.createMany({
          data: params.categoryIds.map((categoryId) => ({
            courseId: params.courseId,
            categoryId,
          })),
        });
      }
    }

    if (params.tagIds !== undefined) {
      await tx.courseTag.deleteMany({ where: { courseId: params.courseId } });
      if (params.tagIds.length) {
        await tx.courseTag.createMany({
          data: params.tagIds.map((tagId) => ({
            courseId: params.courseId,
            tagId,
          })),
        });
      }
    }
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "Course",
    entityId: params.courseId,
    action: "COURSE_TAXONOMY_UPDATED",
  });

  return prisma.course.findUniqueOrThrow({
    where: { id: params.courseId },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  });
}
