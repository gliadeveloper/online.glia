/** Normalize slug params from URLs (decode + NFKC + trim slashes). */
export function normalizeCatalogSlug(value: string): string {
  let slug = value;

  try {
    slug = decodeURIComponent(slug);
  } catch {
    // keep raw value when not URI-encoded
  }

  return slug.normalize("NFKC").trim().replace(/^\/+|\/+$/g, "");
}

/** Admin/catalog slug: lowercase ASCII segment safe for /shop/[slug] paths. */
export function sanitizeCatalogSlugInput(value: string): string {
  const normalized = normalizeCatalogSlug(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "item";
}
