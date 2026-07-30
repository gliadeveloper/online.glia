import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import {
  archiveCoachCourse,
  buildCoursePublishChecklist,
  getCoachCourseDetail,
  publishCoachCourse,
  updateCoachCourse,
} from "@/lib/coach-courses";
import type { CourseLevel } from "@/generated/prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const course = await getCoachCourseDetail(userId, id);
    const checklist = buildCoursePublishChecklist(course);

    return NextResponse.json({ course, checklist });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      action?: "publish" | "archive";
      title?: string;
      description?: string;
      level?: CourseLevel;
      thumbnailUrl?: string;
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);

    if (body.action === "publish") {
      const full = await getCoachCourseDetail(userId, id);
      const checklist = buildCoursePublishChecklist(full);

      if (!checklist.ready) {
        return NextResponse.json(
          {
            error: "발행 전 체크리스트를 완료하세요.",
            code: "PUBLISH_CHECKLIST_FAILED",
            checklist,
          },
          { status: 400 },
        );
      }

      const published = await publishCoachCourse({ coachId: userId, courseId: id });
      return NextResponse.json(published);
    }

    if (body.action === "archive") {
      const course = await archiveCoachCourse({ coachId: userId, courseId: id });
      return NextResponse.json(course);
    }

    const course = await updateCoachCourse({
      coachId: userId,
      courseId: id,
      title: body.title,
      description: body.description,
      level: body.level,
      thumbnailUrl: body.thumbnailUrl,
    });

    return NextResponse.json(course);
  } catch (error) {
    return jsonError(error);
  }
}
