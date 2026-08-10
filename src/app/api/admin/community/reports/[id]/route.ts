import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { resolvePostReport } from "@/lib/post-moderation";
import { mapPostWriteError } from "@/lib/post-write";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      action?: "dismiss" | "hide" | "delete";
      resolution?: string;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (body.action !== "dismiss" && body.action !== "hide" && body.action !== "delete") {
      throw new ApiError('action must be "dismiss", "hide", or "delete"', 400, "INVALID_ACTION");
    }

    const result = await resolvePostReport({
      reportId: id,
      adminUserId: userId,
      action: body.action,
      resolution: body.resolution,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error);
    }

    if (error instanceof Error) {
      const status =
        error.message === "REPORT_NOT_FOUND"
          ? 404
          : error.message === "REPORT_ALREADY_RESOLVED"
            ? 409
            : error.message === "POST_NOT_FOUND" || error.message === "COMMENT_NOT_FOUND"
              ? 404
              : 400;
      const message = mapPostWriteError(error.message);
      return NextResponse.json({ error: message, code: error.message }, { status });
    }

    return jsonError(error);
  }
}
