import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { createModule, getCourseCurriculum } from "@/lib/curriculum-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const course = await getCourseCurriculum(id);
    return NextResponse.json(course);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: courseId } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      title?: string;
      description?: string;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (!body.title?.trim()) {
      throw new ApiError("title is required", 400, "VALIDATION_ERROR");
    }

    const module = await createModule({
      actorId: userId,
      courseId,
      title: body.title,
      description: body.description,
    });

    return NextResponse.json(module, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
