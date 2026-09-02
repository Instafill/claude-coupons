// URL slugs for product pages. Lowercase ASCII, hyphen-separated, and never one of the
// paths that live next to a product page under /coupons.
const RESERVED = new Set([
  "new",
  "admin",
  "api",
  "claim",
  "confirm",
  "stop",
  "me",
  "drops",
  "all",
  "categories",
  "category",
  "founders",
  "wanted",
]);

export const SLUG_SHAPE = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return SLUG_SHAPE.test(slug) && !RESERVED.has(slug);
}

/** Appends -2, -3, ... until `exists` says the slug is free. */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  let candidate = isValidSlug(base) ? base : `${base}-app`;
  let n = 2;
  while (await exists(candidate)) {
    candidate = `${base}-${n++}`;
  }
  return candidate;
}
