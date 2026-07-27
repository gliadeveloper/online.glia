import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { createContent } from "@/lib/curriculum-admin";
import type { ContentType } from "@/generated/prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: lessonId } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      type?: ContentType;
      title?: string;
      url?: string;
      body?: string;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (!body.type) {
      throw new ApiError("type is required", 400, "VALIDATION_ERROR");
    }

    const content = await createContent({
      actorId: userId,
      lessonId,
      type: body.type,
      title: body.title,
      url: body.url,
      body: body.body,
    });

    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
