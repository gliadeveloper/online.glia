import { NextResponse } from "next/server";

import { ApiError, jsonError, resolveUserId } from "@/lib/api";
import { parseAvatarMediaObjectKey } from "@/lib/media/avatar-image";
import { parseCommunityMediaObjectKey } from "@/lib/media/community-media";
import { assertR2MediaAccess } from "@/lib/media/r2-media-access";
import { getR2Object, headR2Object, parseHttpByteRange, resolveHttpByteRange } from "@/lib/media/r2";

function mediaCacheControl(isPublicMedia: boolean) {
  return isPublicMedia ? "public, max-age=300" : "private, max-age=300";
}

async function readObjectBytes(body: unknown) {
  if (
    body &&
    typeof body === "object" &&
    "transformToByteArray" in body &&
    typeof body.transformToByteArray === "function"
  ) {
    return Buffer.from(await body.transformToByteArray());
  }
  throw new ApiError("Object not found", 404, "NOT_FOUND");
}

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

    const rangeHeader = request.headers.get("range");
    if (parseHttpByteRange(rangeHeader)) {
      const head = await headR2Object(objectKey);
      const resolved = resolveHttpByteRange(rangeHeader, head.contentLength);
      const contentType = head.contentType ?? "application/octet-stream";

      if (resolved === "unsatisfiable" || head.contentLength <= 0) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
            "Content-Range": `bytes */${head.contentLength}`,
            "Cache-Control": mediaCacheControl(isPublicMedia),
          },
        });
      }

      if (resolved) {
        const object = await getR2Object(objectKey, `bytes=${resolved.start}-${resolved.end}`);
        const expectedLength = resolved.end - resolved.start + 1;
        const returnedWholeObject =
          object.ContentLength === head.contentLength && expectedLength !== head.contentLength;
        const rangeHeaders = {
          "Content-Type": object.ContentType ?? contentType,
          "Accept-Ranges": "bytes",
          "Cache-Control": mediaCacheControl(isPublicMedia),
        };

        if (returnedWholeObject) {
          const payload = (await readObjectBytes(object.Body)).subarray(resolved.start, resolved.end + 1);
          if (payload.length === 0) {
            return new NextResponse(null, {
              status: 416,
              headers: {
                ...rangeHeaders,
                "Content-Range": `bytes */${head.contentLength}`,
              },
            });
          }
          return new NextResponse(new Uint8Array(payload), {
            status: 206,
            headers: {
              ...rangeHeaders,
              "Content-Length": String(payload.length),
              "Content-Range": `bytes ${resolved.start}-${resolved.start + payload.length - 1}/${head.contentLength}`,
            },
          });
        }

        const body = object.Body;
        const stream =
          body && "transformToWebStream" in body && typeof body.transformToWebStream === "function"
            ? body.transformToWebStream()
            : body;
        return new NextResponse(stream as BodyInit, {
          status: 206,
          headers: {
            ...rangeHeaders,
            "Content-Length": String(object.ContentLength ?? expectedLength),
            "Content-Range": `bytes ${resolved.start}-${resolved.end}/${head.contentLength}`,
          },
        });
      }
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
