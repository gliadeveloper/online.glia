import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { assertCoachOwnsCourse } from "@/lib/coach-courses";
import { createModule } from "@/lib/curriculum-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: courseId } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      order?: number;
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);
    await assertCoachOwnsCourse(userId, courseId);

    if (!body.title?.trim()) {
      throw new ApiError("title is required", 400, "VALIDATION_ERROR");
    }

    const module = await createModule({
      actorId: userId,
      courseId,
      title: body.title,
      description: body.description,
      order: body.order,
    });

    return NextResponse.json(module, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
