import { NextResponse } from "next/server";

import { ApiError, jsonError, resolveUserId } from "@/lib/api";
import { parseAvatarMediaObjectKey } from "@/lib/media/avatar-image";
import { parseCommunityMediaObjectKey } from "@/lib/media/community-media";
import { assertR2MediaAccess } from "@/lib/media/r2-media-access";
import { getR2Object, parseHttpByteRange } from "@/lib/media/r2";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const objectKey = url.searchParams.get("key")?.trim();

    if (!objectKey) {
      throw new ApiError("key is required", 400, "VALIDATION_ERROR");
    }

    const isPublicMedia = Boolean(
      parseAvatarMediaObjectKey(objectKey) || parseCommunityMediaObjectKey(objectKey),
    );

    if (!isPublicMedia) {
      const userId = await resolveUserId(request);
      await assertR2MediaAccess(userId, objectKey);
    }

    const range = parseHttpByteRange(request.headers.get("range"));
    const object = await getR2Object(objectKey, range);
    const body = object.Body;

    if (!body || typeof body === "string") {
      throw new ApiError("Object not found", 404, "NOT_FOUND");
    }

    const stream =
      "transformToWebStream" in body && typeof body.transformToWebStream === "function"
        ? body.transformToWebStream()
        : body;

    const headers = new Headers({
      "Content-Type": object.ContentType ?? "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": isPublicMedia ? "public, max-age=300" : "private, max-age=300",
    });

    if (object.ContentLength != null) {
      headers.set("Content-Length", String(object.ContentLength));
    }

    if (object.ContentRange) {
      headers.set("Content-Range", object.ContentRange);
    }

    return new NextResponse(stream as BodyInit, {
      status: object.ContentRange ? 206 : 200,
      headers,
    });
  } catch (error) {
    return jsonError(error);
  }
}
