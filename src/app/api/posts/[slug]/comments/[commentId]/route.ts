import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { deletePostComment, updatePostComment } from "@/lib/post-mutations";
import { mapPostWriteError } from "@/lib/post-write";
import { getSessionUserId } from "@/lib/session";

type RouteContext = {
  params: Promise<{ slug: string; commentId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("Login required", 401, "UNAUTHORIZED");
    }

    const { slug, commentId } = await context.params;
    const body = (await request.json()) as { body?: string };

    const comment = await updatePostComment({
      userId,
      postSlug: slug,
      commentId,
      body: body.body ?? "",
    });

    return NextResponse.json(comment);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error);
    }

    if (error instanceof Error) {
      const status =
        error.message === "FORBIDDEN" ? 403 : error.message === "COMMENT_NOT_FOUND" ? 404 : 400;
      const message = mapPostWriteError(error.message);
      return NextResponse.json({ error: message, code: error.message }, { status });
    }

    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("Login required", 401, "UNAUTHORIZED");
    }

    const { slug, commentId } = await context.params;
    const result = await deletePostComment({ userId, postSlug: slug, commentId });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error);
    }

    if (error instanceof Error) {
      const status =
        error.message === "FORBIDDEN" ? 403 : error.message === "COMMENT_NOT_FOUND" ? 404 : 400;
      const message = mapPostWriteError(error.message);
      return NextResponse.json({ error: message, code: error.message }, { status });
    }

    return jsonError(error);
  }
}
