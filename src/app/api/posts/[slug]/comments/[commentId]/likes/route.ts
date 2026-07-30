import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { togglePostCommentLike } from "@/lib/post-engagement";
import { getSessionUserId } from "@/lib/session";

type RouteContext = {
  params: Promise<{ slug: string; commentId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("Login required", 401, "UNAUTHORIZED");
    }

    const { slug, commentId } = await context.params;
    const result = await togglePostCommentLike({ postSlug: slug, commentId, userId });

    if (!result) {
      throw new ApiError("Comment not found", 404, "COMMENT_NOT_FOUND");
    }

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
