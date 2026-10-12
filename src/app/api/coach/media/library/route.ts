import { assertMediaLibraryEnabled } from "@/lib/media/rollout";
import { NextResponse } from "next/server";
import { assertCoach, jsonError, requireSessionUserId } from "@/lib/api";
import { listMediaLibrary } from "@/lib/media/library";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const actorId = await requireSessionUserId();
    await assertCoach(actorId);
    assertMediaLibraryEnabled("coach");
    const query = new URL(request.url).searchParams;
    const result = await listMediaLibrary(prisma, actorId, {
      scope: query.get("scope") ?? undefined,
      status: query.get("status") ?? undefined,
      kind: query.get("kind") ?? undefined,
      cursor: query.get("cursor") ?? undefined,
      limit: query.has("limit") ? Number(query.get("limit")) : undefined,
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  } catch (error) {
    const response = jsonError(error);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Vary", "Cookie");
    return response;
  }
}
