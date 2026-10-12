import { assertMediaUploadsEnabled } from "@/lib/media/rollout";
import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, requireSessionUserId } from "@/lib/api";
import { reserveOriginalUpload, type UploadScope } from "@/lib/media/prepare-upload";
import { createR2UploadStore } from "@/lib/media/r2-upload-store";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const actorId = await requireSessionUserId();
    await assertAdmin(actorId);
    assertMediaUploadsEnabled("admin");
    const body = (await request.json()) as { fileName?: string; contentType?: string; byteSize?: number; scope?: string; idempotencyKey?: string };
    if (!body.fileName || !body.contentType || body.byteSize == null || (body.scope !== "PERSONAL" && body.scope !== "SHARED")) {
      throw new ApiError("fileName, contentType, byteSize, scope가 필요합니다.", 400, "VALIDATION_ERROR");
    }
    const reserved = await reserveOriginalUpload(prisma, {
      actorId,
      scope: body.scope as UploadScope,
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
