import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { setPublicNickname } from "@/lib/public-nickname";
import { getSessionUserId } from "@/lib/session";

export async function PATCH(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("Login required", 401, "UNAUTHORIZED");
    }

    const body = (await request.json()) as { nickname?: string };
    const user = await setPublicNickname(userId, body.nickname ?? "");
    return NextResponse.json({ nickname: user.nickname });
  } catch (error) {
    return jsonError(error);
  }
}
