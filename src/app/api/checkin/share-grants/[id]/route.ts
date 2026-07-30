import { NextResponse } from "next/server";

import { jsonError, resolveUserId } from "@/lib/api";
import { getShareGrantPreviewForMember } from "@/lib/checkin-share/grants";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(_request);

    const preview = await getShareGrantPreviewForMember(id, userId);
    return NextResponse.json(preview);
  } catch (error) {
    return jsonError(error);
  }
}
