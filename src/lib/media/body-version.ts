/** Same snapshot format in the editor and server; JSON key order is immaterial. */
export type MediaBody = {
  body?: string | null;
  url?: string | null;
  metadata?: unknown;
};

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}

export async function mediaBodyVersion(body: MediaBody): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(canonical({
    body: body.body ?? null,
    url: body.url ?? null,
    metadata: body.metadata ?? null,
  })));
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
