import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { togglePostLike } from "@/lib/post-engagement";
import { getSessionUserId } from "@/lib/session";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("Login required", 401, "UNAUTHORIZED");
    }

    const { slug } = await context.params;
    const result = await togglePostLike({ postSlug: slug, userId });

    if (!result) {
      throw new ApiError("Post not found", 404, "POST_NOT_FOUND");
    }

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
