import "server-only";
import { assertMediaLibraryEnabled } from "./rollout";
import { NextResponse } from "next/server";
import { ApiError, assertAdmin, assertCoach, jsonError, requireSessionUserId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { setMediaLibraryStatus } from "./library-lifecycle";

export function createLibraryMutationHandler(role: "admin" | "coach") {
  return async (request: Request, context: { params: Promise<{ id: string }> }) => {
    let response: NextResponse;
    try {
      const actorId = await requireSessionUserId();
      await (role === "admin" ? assertAdmin(actorId) : assertCoach(actorId));
      assertMediaLibraryEnabled(role);
      const { id } = await context.params;
      const body: unknown = await request.json().catch(() => null);
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError("요청이 올바르지 않습니다.", 400, "VALIDATION_ERROR");
      const { libraryStatus, expectedVersion } = body as Record<string, unknown>;
      response = NextResponse.json(await setMediaLibraryStatus(prisma, { actorId, assetId: id, libraryStatus, expectedVersion }));
    } catch (error) { response = jsonError(error); }
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Vary", "Cookie");
    return response;
  };
}
