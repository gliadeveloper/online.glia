import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import {
  archiveCoachCourse,
  buildCoursePublishChecklist,
  createCoachCourse,
  getCoachCourseDetail,
  publishCoachCourse,
  summarizeCoachCourses,
  updateCoachCourse,
} from "@/lib/coach-courses";
import type { CourseLevel } from "@/generated/prisma/client";

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const courses = await summarizeCoachCourses(userId);
    return NextResponse.json(courses);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      level?: CourseLevel;
      thumbnailUrl?: string;
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);

    if (!body.title?.trim()) {
      throw new ApiError("title is required", 400, "VALIDATION_ERROR");
    }

    const course = await createCoachCourse({
      coachId: userId,
      title: body.title,
      description: body.description,
      level: body.level,
      thumbnailUrl: body.thumbnailUrl,
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
