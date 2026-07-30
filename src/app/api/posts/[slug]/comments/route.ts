import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { createPostComment } from "@/lib/post-mutations";
import { mapPostWriteError } from "@/lib/post-write";
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

    const { slug } = await context.params;
    const body = (await request.json()) as { body?: string };

    const comment = await createPostComment({
      userId,
      postSlug: slug,
      body: body.body ?? "",
    });

    if (!comment) {
      throw new ApiError("Post not found", 404, "POST_NOT_FOUND");
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
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
