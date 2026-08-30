/** Client-safe URL helpers. Do not import prisma or session here. */

/** Only http(s) counts as a user-entered image URL. Signup presets are data: URIs. */
export function editableAvatarUrl(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? value.trim() : "";
  } catch {
    return "";
  }
}

/** Preview/src: uploaded R2 proxy, public http(s), never data: presets. */
export function profileAvatarSrc(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const trimmed = value.trim();
  if (trimmed.startsWith("/api/media/r2?")) {
    try {
      const key = new URL(trimmed, "http://localhost").searchParams.get("key") ?? "";
      return key.startsWith("avatars/") ? trimmed : "";
    } catch {
      return "";
    }
  }
  return editableAvatarUrl(trimmed);
}
