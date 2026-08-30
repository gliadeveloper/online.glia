import { NextResponse } from "next/server";

import { ApiError, jsonError, resolveUserId } from "@/lib/api";
import { parseAvatarMediaObjectKey } from "@/lib/media/avatar-image";
import { assertR2MediaAccess } from "@/lib/media/r2-media-access";
import { getR2Object } from "@/lib/media/r2";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const objectKey = url.searchParams.get("key")?.trim();

    if (!objectKey) {
      throw new ApiError("key is required", 400, "VALIDATION_ERROR");
    }

    if (!parseAvatarMediaObjectKey(objectKey)) {
      const userId = await resolveUserId(request);
      await assertR2MediaAccess(userId, objectKey);
    }

    const object = await getR2Object(objectKey);
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
        "Content-Type": object.ContentType ?? "application/octet-stream",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
