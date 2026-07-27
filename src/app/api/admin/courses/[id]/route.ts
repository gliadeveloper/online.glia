import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { courseInclude, updateCourse, updateCourseStatus } from "@/lib/courses";
import type { CourseLevel } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const course = await prisma.course.findUnique({
      where: { id },
      include: courseInclude,
    });

    if (!course) {
      throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    return NextResponse.json(course);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      action?: "publish" | "archive";
      title?: string;
      description?: string;
      level?: CourseLevel;
      thumbnailUrl?: string;
      isFeatured?: boolean;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (body.action === "publish" || body.action === "archive") {
      const course = await updateCourseStatus({
        actorId: userId,
        courseId: id,
        action: body.action,
      });
      return NextResponse.json(course);
    }

    const course = await updateCourse({
      actorId: userId,
      courseId: id,
      title: body.title,
      description: body.description,
      level: body.level,
      thumbnailUrl: body.thumbnailUrl,
      isFeatured: body.isFeatured,
    });

    return NextResponse.json(course);
  } catch (error) {
    return jsonError(error);
  }
}
