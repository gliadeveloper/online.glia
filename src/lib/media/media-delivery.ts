import "server-only";
import { NextResponse } from "next/server";
import { ApiError, jsonError } from "@/lib/api";
import { getR2StoredObject, headR2StoredObject, parseHttpByteRange, resolveHttpByteRange } from "./r2";
import type { MediaLocation } from "./media-location";

export function createMediaGetHandler(dependencies: {
  resolve: (url: URL) => Promise<MediaLocation>;
  head?: typeof headR2StoredObject;
  get?: typeof getR2StoredObject;
}) {
  const head = dependencies.head ?? headR2StoredObject;
  const get = dependencies.get ?? getR2StoredObject;
  return async function GET(request: Request) {
    try {
      const url = new URL(request.url);
      const { objectKey, isPublic: isPublicMedia, mimeType } = await dependencies.resolve(url);
      const rangeHeader = request.headers.get("range");
      if (parseHttpByteRange(rangeHeader)) {
        const metadata = await head(objectKey);
        const resolved = resolveHttpByteRange(rangeHeader, metadata.contentLength);
        const contentType = mimeType ?? metadata.contentType ?? "application/octet-stream";

        if (resolved === "unsatisfiable" || metadata.contentLength <= 0) {
          return new NextResponse(null, {
            status: 416,
            headers: {
              "Content-Type": contentType,
              "Accept-Ranges": "bytes",
              "Content-Range": `bytes */${metadata.contentLength}`,
              "Cache-Control": mediaCacheControl(isPublicMedia),
              "X-Content-Type-Options": "nosniff",
              "Vary": "Cookie",
            },
          });
        }

        if (resolved) {
          const object = await get(objectKey, `bytes=${resolved.start}-${resolved.end}`);
          const expectedLength = resolved.end - resolved.start + 1;
          const returnedWholeObject =
            object.ContentLength === metadata.contentLength && expectedLength !== metadata.contentLength;
          const rangeHeaders = {
            "Content-Type": mimeType ?? object.ContentType ?? contentType,
            "Accept-Ranges": "bytes",
            "Cache-Control": mediaCacheControl(isPublicMedia),
            "X-Content-Type-Options": "nosniff",
            "Vary": "Cookie",
          };

          if (returnedWholeObject) {
            const payload = (await readObjectBytes(object.Body)).subarray(resolved.start, resolved.end + 1);
            if (payload.length === 0) {
              return new NextResponse(null, {
                status: 416,
                headers: {
                  ...rangeHeaders,
                  "Content-Range": `bytes */${metadata.contentLength}`,
                },
              });
            }
            return new NextResponse(new Uint8Array(payload), {
              status: 206,
              headers: {
                ...rangeHeaders,
                "Content-Length": String(payload.length),
                "Content-Range": `bytes ${resolved.start}-${resolved.start + payload.length - 1}/${metadata.contentLength}`,
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
              "Content-Range": `bytes ${resolved.start}-${resolved.end}/${metadata.contentLength}`,
            },
          });
        }
      }

      const object = await get(objectKey);
      const body = object.Body;

      if (!body || typeof body === "string") {
        throw new ApiError("Object not found", 404, "NOT_FOUND");
      }

      const stream =
        "transformToWebStream" in body && typeof body.transformToWebStream === "function"
          ? body.transformToWebStream()
          : body;

      const headers = new Headers({
        "Content-Type": mimeType ?? object.ContentType ?? "application/octet-stream",
        "Accept-Ranges": "bytes",
        "Cache-Control": mediaCacheControl(isPublicMedia),
        "X-Content-Type-Options": "nosniff",
        "Vary": "Cookie",
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
      const response = jsonError(error);
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Vary", "Cookie");
      return response;
    }
  };
}

function mediaCacheControl(isPublicMedia: boolean) {
  return isPublicMedia ? "public, max-age=300" : "private, no-store";
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
