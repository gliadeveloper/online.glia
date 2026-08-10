import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { deletePublishedPost, updatePublishedPost } from "@/lib/post-mutations";
import { mapPostWriteError } from "@/lib/post-write";
import { getSessionUserId } from "@/lib/session";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("Login required", 401, "UNAUTHORIZED");
    }

    const { slug } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      bodyMarkdown?: string;
    };

    const post = await updatePublishedPost({
      userId,
      postSlug: slug,
      title: body.title ?? "",
      bodyMarkdown: body.bodyMarkdown ?? "",
    });

    return NextResponse.json({ slug: post.slug, title: post.title });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error);
    }

    if (error instanceof Error) {
      const status = error.message === "FORBIDDEN" ? 403 : error.message === "POST_NOT_FOUND" ? 404 : 400;
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

    const { slug } = await context.params;
    const result = await deletePublishedPost({ userId, postSlug: slug });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error);
    }

    if (error instanceof Error) {
      const status = error.message === "FORBIDDEN" ? 403 : error.message === "POST_NOT_FOUND" ? 404 : 400;
      const message = mapPostWriteError(error.message);
      return NextResponse.json({ error: message, code: error.message }, { status });
    }

    return jsonError(error);
  }
}
