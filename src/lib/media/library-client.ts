import { libraryMediaRule, type LibraryMediaKind } from "./content-signature";

export type MediaApiRole = "admin" | "coach";
export type LibraryScope = "PERSONAL" | "SHARED";
export type LibraryStatus = "ACTIVE" | "TRASHED";
export type LibraryItem = {
  id: string; scope: LibraryScope; kind: LibraryMediaKind; originalName: string; createdAt: string;
  libraryStatus: LibraryStatus; version: string; canManage: boolean; usageCount: number;
  trashedAt: string | null; trashExpiresAt: string | null;
  files: { id: string; role: string; mimeType: string | null; byteSize: string | null; url: string }[];
};
export type LibraryPage = { items: LibraryItem[]; nextCursor: string | null };
export type UploadPhase = "예약 중" | "파일 전송 중" | "파일 확인 중";
type UploadReservation = {
  uploadId: string; assetId: string; status: string; uploadUrl: string | null;
  uploadHeaders: { "content-type": string; "content-length": string } | null;
  uploadExpiresAt: string; mediaUrl: string | null;
};
export type UploadedMedia = { assetId: string; url: string; kind: LibraryMediaKind; name: string };

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mp3: "audio/mpeg", m4a: "audio/mp4",
  wav: "audio/wav", aac: "audio/aac", ogg: "audio/ogg", flac: "audio/flac", aiff: "audio/aiff", aif: "audio/aiff", caf: "audio/x-caf",
};
export const LIBRARY_FILE_ACCEPT = Object.keys(EXTENSION_MIME).map(ext => `.${ext}`).join(",");

export function libraryFileRule(file: Pick<File, "name" | "type" | "size">) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const fallback = Object.hasOwn(EXTENSION_MIME, ext) ? EXTENSION_MIME[ext] : "";
  const rule = libraryMediaRule(file.type) ?? libraryMediaRule(fallback);
  if (!rule) throw new Error("지원하는 이미지·영상·오디오 파일을 선택해 주세요.");
  if (file.size < 1 || file.size > rule.maxBytes) throw new Error(`${rule.kind === "IMAGE" ? "이미지는 10MB" : rule.kind === "AUDIO" ? "오디오는 200MB" : "영상은 500MB"} 이하의 파일을 선택해 주세요.`);
  return rule;
}

class MediaResponseError extends Error {
  constructor(message: string, readonly code?: string) { super(message); }
}

async function responseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new MediaResponseError(data?.error ?? "요청을 완료하지 못했습니다. 다시 시도해 주세요.", data?.code);
  return data as T;
}

export async function fetchMediaLibrary(role: MediaApiRole, scope: LibraryScope, kind: string, cursor?: string, signal?: AbortSignal, status: LibraryStatus = "ACTIVE"): Promise<LibraryPage> {
  const query = new URLSearchParams({ scope, status, limit: "30" });
  if (kind) query.set("kind", kind);
  if (cursor) query.set("cursor", cursor);
  return responseJson(await fetch(`/api/${role}/media/library?${query}`, { signal, cache: "no-store" }));
}

export async function changeMediaLibraryStatus(role: MediaApiRole, item: LibraryItem, libraryStatus: LibraryStatus) {
  return responseJson(await fetch(`/api/${role}/media/library/${encodeURIComponent(item.id)}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ libraryStatus, expectedVersion: item.version }),
  }));
}

/** Keep a selected File's reservation across retries in this editor. A lost
 * completion response retries completion, never creates another asset or PUT.
 * Browser Content-Length is derived from File; it is a forbidden request header.
 */
export function createLibraryUploader(role: MediaApiRole, request: typeof fetch = fetch) {
  const attempts = new WeakMap<File, Map<LibraryScope, { key: string; reservation?: UploadReservation; transferred: boolean }>>();
  return async (file: File, scope: LibraryScope, onPhase: (phase: UploadPhase) => void = () => {}): Promise<UploadedMedia> => {
    const rule = libraryFileRule(file);
    if (scope === "SHARED" && role !== "admin") throw new Error("공통 자료는 관리자만 등록할 수 있습니다.");
    let byScope = attempts.get(file);
    if (!byScope) { byScope = new Map(); attempts.set(file, byScope); }
    let attempt = byScope.get(scope);
    if (!attempt) { attempt = { key: crypto.randomUUID(), transferred: false }; byScope.set(scope, attempt); }
    const base = `/api/${role}/media/library/uploads`;
    if (!attempt.reservation) {
      onPhase("예약 중");
      attempt.reservation = await responseJson<UploadReservation>(await request(base, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, fileName: file.name, contentType: rule.mimeType, byteSize: file.size, idempotencyKey: attempt.key }),
      }));
    }
    const reservation = attempt.reservation;
    if (reservation.status === "ABANDONED") throw new Error("만료되었거나 사용할 수 없는 파일입니다. 파일을 다시 선택해 주세요.");
    if (reservation.status === "ISSUED" && !attempt.transferred) {
      if (!reservation.uploadUrl || !reservation.uploadHeaders || Date.parse(reservation.uploadExpiresAt) <= Date.now()) {
        throw new Error("업로드 시간이 만료되었습니다. 파일을 다시 선택해 주세요.");
      }
      onPhase("파일 전송 중");
      // R2 sometimes closes the TLS session with bad_record_mac while the body is in flight.
      // The next attempt on the same staging URL usually completes.
      let transmitted = false;
      for (let n = 0; n < 3 && !transmitted; n += 1) {
        try {
          const put = await request(reservation.uploadUrl, {
            method: "PUT", credentials: "omit", body: file,
            headers: { "Content-Type": reservation.uploadHeaders["content-type"] },
          });
          transmitted = put.ok;
        } catch { /* The browser reports the closed session as a connection reset. */ }
      }
      if (!transmitted) {
        onPhase("파일 확인 중");
        // PUT may have committed despite a transport error. Once completion is
        // attempted, retry that check before sending any more bytes.
        attempt.transferred = true;
        const response = await request(`${base}/${encodeURIComponent(reservation.uploadId)}/complete`, { method: "POST" });
        const data = await response.json().catch(() => null) as (UploadReservation & { error?: string; code?: string }) | null;
        if (response.ok && data?.status === "COMPLETED" && data.mediaUrl?.startsWith("/api/media/r2?key=")) {
          attempt.transferred = true;
          attempt.reservation = data;
          return { assetId: data.assetId, url: data.mediaUrl, kind: rule.kind, name: file.name };
        }
        if (data?.code === "MEDIA_STAGING_ABSENT") attempt.transferred = false;
        throw new Error(data?.code === "MEDIA_STAGING_ABSENT"
          ? "파일 전송이 중간에 끊겼습니다. 다시 시도해 주세요."
          : (data?.error ?? "파일 전송이 중간에 끊겼습니다. 다시 시도해 주세요."));
      }
      attempt.transferred = true;
    }
    onPhase("파일 확인 중");
    let completed: UploadReservation;
    try {
      completed = reservation.status === "COMPLETED" ? reservation : await responseJson<UploadReservation>(
        await request(`${base}/${encodeURIComponent(reservation.uploadId)}/complete`, { method: "POST" }),
      );
    } catch (error) {
      if (error instanceof MediaResponseError && error.code === "MEDIA_STAGING_ABSENT") attempt.transferred = false;
      throw error;
    }
    if (completed.status !== "COMPLETED" || !completed.mediaUrl?.startsWith("/api/media/r2?key=")) {
      throw new Error("파일 확인이 끝나지 않았습니다. 잠시 후 다시 시도해 주세요.");
    }
    attempt.reservation = completed;
    return { assetId: completed.assetId, url: completed.mediaUrl, kind: rule.kind, name: file.name };
  };
}
