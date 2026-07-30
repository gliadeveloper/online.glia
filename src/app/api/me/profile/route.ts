import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { updateMyProfile } from "@/lib/profile";
import { getSessionUserId } from "@/lib/session";

export async function PATCH(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("Login required", 401, "UNAUTHORIZED");
    }

    const body = (await request.json()) as {
      name?: string;
      headline?: string | null;
      bio?: string | null;
      avatarUrl?: string | null;
    };

    const profile = await updateMyProfile(userId, body);

    return NextResponse.json({ profile });
  } catch (error) {
    return jsonError(error);
  }
}
