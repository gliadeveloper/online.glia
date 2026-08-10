import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { createPublishedPost } from "@/lib/post-mutations";
import { mapPostWriteError } from "@/lib/post-write";
import { assertRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("Login required", 401, "UNAUTHORIZED");
    }

    assertRateLimit(`post:create:${userId}`, 5, 60_000);

    const body = (await request.json()) as {
      title?: string;
      bodyMarkdown?: string;
      parentPostSlug?: string | null;
    };

    const post = await createPublishedPost({
      userId,
      title: body.title ?? "",
      bodyMarkdown: body.bodyMarkdown ?? "",
      parentPostSlug: body.parentPostSlug ?? null,
    });

    return NextResponse.json({ slug: post.slug, id: post.id, title: post.title }, { status: 201 });
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
