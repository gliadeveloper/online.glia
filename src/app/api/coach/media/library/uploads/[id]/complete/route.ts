import { assertMediaUploadsEnabled } from "@/lib/media/rollout";
import { NextResponse } from "next/server";

import { assertCoach, jsonError, requireSessionUserId } from "@/lib/api";
import { completeOriginalUpload } from "@/lib/media/prepare-upload";
import { createR2UploadStore } from "@/lib/media/r2-upload-store";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const actorId = await requireSessionUserId();
    await assertCoach(actorId);
    assertMediaUploadsEnabled("coach");
    const { id } = await context.params;
    const completed = await completeOriginalUpload(prisma, { actorId, uploadId: id }, createR2UploadStore());
    return NextResponse.json(completed);
  } catch (error) {
    return jsonError(error);
  }
}
