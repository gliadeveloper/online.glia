import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { listPendingPostReports } from "@/lib/post-moderation";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const reports = await listPendingPostReports();
    return NextResponse.json(reports);
  } catch (error) {
    return jsonError(error);
  }
}
