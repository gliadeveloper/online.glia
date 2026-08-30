import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { uploadAvatarImageBuffer } from "@/lib/media/avatar-image";
import { MAX_AVATAR_IMAGE_BYTES } from "@/lib/media/avatar-image-constants";
import { updateMyProfile } from "@/lib/profile";
import { getSessionUserId } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED");
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ApiError("이미지 파일을 선택해 주세요.", 400, "VALIDATION_ERROR");
    }

    if (file.size > MAX_AVATAR_IMAGE_BYTES) {
      throw new ApiError("이미지는 5MB 이하만 업로드할 수 있습니다.", 400, "VALIDATION_ERROR");
    }

    const contentType = file.type.trim() || "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadAvatarImageBuffer({
      userId,
      fileName: file.name || "avatar",
      contentType,
      buffer,
    });

    const profile = await updateMyProfile(userId, { avatarUrl: uploaded.publicUrl });

    return NextResponse.json({
      publicUrl: uploaded.publicUrl,
      profile,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      throw new ApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED");
    }

    const profile = await updateMyProfile(userId, { avatarUrl: null });
    return NextResponse.json({ profile });
  } catch (error) {
    return jsonError(error);
  }
}
