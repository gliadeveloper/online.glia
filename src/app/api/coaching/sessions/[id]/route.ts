import { NextResponse } from "next/server";

import { ApiError, jsonError, resolveUserId } from "@/lib/api";
import {
  getCoachingSessionForUser,
  markSessionViewed,
  sendCoachingMessage,
} from "@/lib/coaching";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });

    const session = await getCoachingSessionForUser(id, userId);

    if (session.userId === userId && session.publicationStatus === "PUBLISHED") {
      await markSessionViewed(id, userId);
    }

    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { userId?: string; bodyMarkdown?: string };
    const userId = await resolveUserId(request, body);

    if (!body.bodyMarkdown?.trim()) {
      throw new ApiError("bodyMarkdown is required", 400, "VALIDATION_ERROR");
    }

    const message = await sendCoachingMessage({
      sessionId: id,
      authorId: userId,
      bodyMarkdown: body.bodyMarkdown,
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
