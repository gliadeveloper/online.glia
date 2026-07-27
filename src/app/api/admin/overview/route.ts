import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { getAdminOverview } from "@/lib/admin";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const overview = await getAdminOverview();
    return NextResponse.json(overview);
  } catch (error) {
    return jsonError(error);
  }
}
