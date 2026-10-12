import "server-only";
import { NextResponse } from "next/server";
import { assertAdmin, assertCoach, jsonError, requireSessionUserId } from "@/lib/api";
import { mediaLibraryCapabilities } from "./rollout";

export function createLibraryCapabilitiesHandler(role: "admin" | "coach") {
  return async () => {
    let response: NextResponse;
    try {
      const actorId = await requireSessionUserId();
      await (role === "admin" ? assertAdmin(actorId) : assertCoach(actorId));
      response = NextResponse.json(mediaLibraryCapabilities(role));
    } catch (error) { response = jsonError(error); }
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Vary", "Cookie");
    return response;
  };
}
