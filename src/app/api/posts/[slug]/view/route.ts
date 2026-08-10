import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { recordPostViewIfNew } from "@/lib/post-views";
import { prisma } from "@/lib/prisma";
import { assertRateLimit, getClientIp, RateLimitError } from "@/lib/rate-limit";
import { getSessionUserId } from "@/lib/session";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const VIEWER_COOKIE = "glia_post_viewer";

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const ip = getClientIp(request);
    assertRateLimit(`post:view:${ip}`, 120, 60_000);

    const post = await prisma.post.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: { id: true },
    });

    if (!post) {
      throw new ApiError("Post not found", 404, "POST_NOT_FOUND");
    }

    const userId = await getSessionUserId();
    let viewerKey = userId;

    if (!viewerKey) {
      const cookieStore = await cookies();
      viewerKey = cookieStore.get(VIEWER_COOKIE)?.value ?? null;

      if (!viewerKey) {
        viewerKey = crypto.randomUUID();
        cookieStore.set(VIEWER_COOKIE, viewerKey, {
          httpOnly: true,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365,
          path: "/",
        });
      }
    }

    const counted = await recordPostViewIfNew(post.id, viewerKey);
    return NextResponse.json({ counted });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message, code: "RATE_LIMITED" }, { status: 429 });
    }

    return jsonError(error);
  }
}
