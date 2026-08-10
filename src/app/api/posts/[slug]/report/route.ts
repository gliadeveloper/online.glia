import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { createPostReport, parsePostReportReason, validateReportDetail } from "@/lib/post-reports";
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

    assertRateLimit(`post:report:${userId}`, 10, 60 * 60 * 1000);

    const { slug } = await context.params;
    const body = (await request.json()) as { reason?: string; detail?: string };

    const report = await createPostReport({
      reporterId: userId,
      targetType: "POST",
      postSlug: slug,
      reason: parsePostReportReason(body.reason),
      detail: validateReportDetail(body.detail),
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message, code: "RATE_LIMITED" }, { status: 429 });
    }

    if (error instanceof ApiError) {
      return jsonError(error);
    }

    if (error instanceof Error) {
      const status =
        error.message === "POST_NOT_FOUND"
          ? 404
          : error.message === "REPORT_ALREADY_EXISTS"
            ? 409
            : 400;
      const message = mapPostWriteError(error.message);
      return NextResponse.json({ error: message, code: error.message }, { status });
    }

    return jsonError(error);
  }
}
