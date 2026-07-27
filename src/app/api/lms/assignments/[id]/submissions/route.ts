import { NextResponse } from "next/server";

import { jsonError, resolveUserId } from "@/lib/api";
import { submitAssignment } from "@/lib/assessment-customer";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: assignmentId } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      courseSlug?: string;
      content?: string;
    };

    const userId = await resolveUserId(request, body);

    if (!body.courseSlug?.trim()) {
      return NextResponse.json({ error: "courseSlug is required" }, { status: 400 });
    }

    const submission = await submitAssignment({
      userId,
      courseSlug: body.courseSlug,
      assignmentId,
      content: body.content ?? "",
    });

    return NextResponse.json(submission);
  } catch (error) {
    return jsonError(error);
  }
}
