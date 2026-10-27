import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { getMemberContact, updateMemberContact } from "@/lib/member-contact-server";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("Login required", 401, "UNAUTHORIZED");
    }

    const contact = await getMemberContact(userId);
    if (!contact) {
      throw new ApiError("사용자를 찾을 수 없습니다.", 404, "NOT_FOUND");
    }

    return NextResponse.json({ contact });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("Login required", 401, "UNAUTHORIZED");
    }

    const body = (await request.json()) as {
      name?: string;
      phoneNumber?: string;
      email?: string;
    };

    const contact = await updateMemberContact(userId, {
      name: body.name ?? "",
      phoneNumber: body.phoneNumber ?? "",
      email: body.email,
    });

    return NextResponse.json({ contact });
  } catch (error) {
    return jsonError(error);
  }
}
