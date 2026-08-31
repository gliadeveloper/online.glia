import { NextResponse } from "next/server";

import { ApiError, jsonError, resolveUserId } from "@/lib/api";
import {
  assertCanDownloadLessonMaterial,
  buildMaterialContentDisposition,
  getLessonMaterialForDownload,
} from "@/lib/lesson-materials";
import { getR2Object } from "@/lib/media/r2";

type RouteContext = { params: Promise<{ lessonId: string; materialId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { lessonId, materialId } = await context.params;
    const userId = await resolveUserId(request);
    await assertCanDownloadLessonMaterial(userId, lessonId);

    const material = await getLessonMaterialForDownload({ lessonId, materialId });
    const object = await getR2Object(material.objectKey);
    const body = object.Body;

    if (!body || typeof body === "string") {
      throw new ApiError("Object not found", 404, "NOT_FOUND");
    }

    const stream =
      "transformToWebStream" in body && typeof body.transformToWebStream === "function"
        ? body.transformToWebStream()
        : body;

    return new NextResponse(stream as BodyInit, {
      headers: {
        "Content-Type": material.contentType || object.ContentType || "application/octet-stream",
        "Content-Disposition": buildMaterialContentDisposition(material.originalName),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
