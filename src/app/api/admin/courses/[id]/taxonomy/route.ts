import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { setCourseTaxonomy } from "@/lib/taxonomy-admin";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: courseId } = await context.params;
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({
      categoryIds: course.categories.map((item) => item.categoryId),
      tagIds: course.tags.map((item) => item.tagId),
      categories: course.categories.map((item) => item.category),
      tags: course.tags.map((item) => item.tag),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: courseId } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      categoryIds?: string[];
      tagIds?: string[];
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    const course = await setCourseTaxonomy({
      actorId: userId,
      courseId,
      categoryIds: body.categoryIds,
      tagIds: body.tagIds,
    });

    return NextResponse.json(course);
  } catch (error) {
    return jsonError(error);
  }
}
