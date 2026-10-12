import { assertMediaUploadsEnabled } from "@/lib/media/rollout";
import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, requireSessionUserId } from "@/lib/api";
import { reserveOriginalUpload } from "@/lib/media/prepare-upload";
import { createR2UploadStore } from "@/lib/media/r2-upload-store";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const actorId = await requireSessionUserId();
    await assertCoach(actorId);
    assertMediaUploadsEnabled("coach");
    const body = (await request.json()) as { fileName?: string; contentType?: string; byteSize?: number; idempotencyKey?: string };
    if (!body.fileName || !body.contentType || body.byteSize == null) {
      throw new ApiError("fileName, contentType, byteSize가 필요합니다.", 400, "VALIDATION_ERROR");
    }
    const reserved = await reserveOriginalUpload(prisma, {
      actorId,
      scope: "PERSONAL",
      fileName: body.fileName,
      contentType: body.contentType,
      byteSize: body.byteSize,
      idempotencyKey: body.idempotencyKey,
    }, createR2UploadStore());
    return NextResponse.json(reserved);
  } catch (error) {
    return jsonError(error);
  }
}
