import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { createPostComment } from "@/lib/post-mutations";
import { mapPostWriteError } from "@/lib/post-write";
import { assertRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("Login required", 401, "UNAUTHORIZED");
    }

    assertRateLimit(`post:comment:${userId}`, 20, 60_000);

    const { slug } = await context.params;
    const body = (await request.json()) as { body?: string; parentCommentId?: string | null };

    const comment = await createPostComment({
      userId,
      postSlug: slug,
      body: body.body ?? "",
      parentCommentId: body.parentCommentId ?? null,
    });

    if (!comment) {
      throw new ApiError("Post not found", 404, "POST_NOT_FOUND");
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message, code: "RATE_LIMITED" }, { status: 429 });
    }

    if (error instanceof ApiError) {
      return jsonError(error);
    }

    if (error instanceof Error) {
      const message = mapPostWriteError(error.message);
      return NextResponse.json({ error: message, code: error.message }, { status: 400 });
    }

    return jsonError(error);
  }
}
