import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { courseInclude, createCourse } from "@/lib/courses";
import type { CourseLevel } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const courses = await prisma.course.findMany({
      orderBy: { updatedAt: "desc" },
      include: courseInclude,
    });

    return NextResponse.json(courses);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      title?: string;
      description?: string;
      instructorId?: string;
      organizationId?: string;
      level?: CourseLevel;
      publish?: boolean;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (!body.title?.trim() || !body.instructorId) {
      throw new ApiError("title, instructorId are required", 400, "VALIDATION_ERROR");
    }

    const course = await createCourse({
      actorId: userId,
      title: body.title,
      description: body.description,
      instructorId: body.instructorId,
      organizationId: body.organizationId,
      level: body.level,
      publish: body.publish,
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
