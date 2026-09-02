import { Types } from "mongoose";

import { extractDomain } from "@/lib/domains";
import { dbConnect } from "@/lib/mongodb";
import {
  DEFAULT_THRESHOLD,
  MIN_DESCRIPTION_WORDS,
  type PageState,
  type PublicDrop,
  type PublicProduct,
  pageState,
  wordCount,
} from "@/lib/product-state";
import { isValidSlug, slugify, uniqueSlug } from "@/lib/slug";
import Drop, { IDrop } from "@/models/Drop";
import Product, { IProduct, PRODUCT_STATUS, ProductFaq, ProductSource } from "@/models/Product";

// Reading and creating product pages. The derived facts every page needs - where the queue
// stands against its goal, which public state the page is in - live in lib/product-state.ts
// so client components can share them without pulling the database into the bundle.
export * from "@/lib/product-state";

export interface ProductInput {
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  logoUrl?: string;
  threshold?: number;
  slug?: string;
  faqs?: ProductFaq[];
}

export type ProductValidation = { ok: true; value: Required<ProductInput> & { websiteDomain: string } } | { ok: false; error: string };

// Everything a page needs checked before it can exist, in the order a form would show
// the complaint. Returns the cleaned values rather than mutating the input.
export function validateProduct(input: ProductInput): ProductValidation {
  const name = input.name.trim();
  const tagline = input.tagline.trim();
  const description = input.description.trim();
  const websiteUrl = input.websiteUrl.trim();
  const logoUrl = (input.logoUrl || "").trim();
  const threshold = input.threshold ?? DEFAULT_THRESHOLD;

  if (name.length < 2 || name.length > 80) return { ok: false, error: "Give the product a name (2 to 80 characters)." };
  if (tagline.length < 10 || tagline.length > 140) return { ok: false, error: "The one-line summary should be 10 to 140 characters." };
  if (wordCount(description) < MIN_DESCRIPTION_WORDS)
    return { ok: false, error: `Describe the product in at least ${MIN_DESCRIPTION_WORDS} words - a page that says nothing helps nobody.` };
  if (description.length > 4000) return { ok: false, error: "The description is over 4,000 characters." };
  const websiteDomain = extractDomain(websiteUrl);
  if (!websiteDomain || !websiteUrl.startsWith("https://"))
    return { ok: false, error: "The website has to be a full https:// address." };
  if (logoUrl && !logoUrl.startsWith("https://")) return { ok: false, error: "The logo has to be an https:// image URL." };
  if (!Number.isInteger(threshold) || threshold < 5 || threshold > 100000)
    return { ok: false, error: "The goal should be a whole number between 5 and 100,000." };
  const slug = input.slug ? input.slug.trim().toLowerCase() : slugify(name);
  if (input.slug && !isValidSlug(slug)) return { ok: false, error: "That slug is not usable - lowercase letters, digits and hyphens only." };
  const faqs = (input.faqs || [])
    .map((f) => ({ q: f.q.trim(), a: f.a.trim() }))
    .filter((f) => f.q && f.a)
    .slice(0, 12);

  return {
    ok: true,
    value: { name, tagline, description, websiteUrl, logoUrl, threshold, slug, websiteDomain, faqs },
  };
}

export async function createProduct(
  input: ProductInput,
  meta: { source: ProductSource; createdByUserId?: string; ownerUserId?: string }
): Promise<{ product: IProduct } | { error: string }> {
  const checked = validateProduct(input);
  if (!checked.ok) return { error: checked.error };
  const { value } = checked;

  await dbConnect();
  const slug = await uniqueSlug(value.slug, async (candidate) =>
    Boolean(await Product.exists({ slug: candidate }))
  );

  const product = await Product.create({
    slug,
    name: value.name,
    tagline: value.tagline,
    description: value.description,
    websiteUrl: value.websiteUrl,
    websiteDomain: value.websiteDomain,
    ...(value.logoUrl ? { logoUrl: value.logoUrl } : {}),
    threshold: value.threshold,
    faqs: value.faqs,
    source: meta.source,
    ...(meta.createdByUserId ? { createdByUserId: new Types.ObjectId(meta.createdByUserId) } : {}),
    ...(meta.ownerUserId
      ? { ownerUserId: new Types.ObjectId(meta.ownerUserId), claimedAt: new Date() }
      : {}),
  });
  return { product };
}

export async function getProductBySlug(
  slug: string,
  options: { includeArchived?: boolean } = {}
): Promise<IProduct | null> {
  await dbConnect();
  const product = await Product.findOne({ slug: slug.toLowerCase() });
  if (!product) return null;
  if (product.status === PRODUCT_STATUS.archived && !options.includeArchived) return null;
  return product;
}

export async function getCurrentDrop(product: IProduct): Promise<IDrop | null> {
  if (!product.currentDropId) return null;
  return Drop.findById(product.currentDropId);
}

// ---- Plain shapes for client components ---------------------------------------------

export function toPublicProduct(product: IProduct): PublicProduct {
  return {
    id: product._id.toString(),
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    websiteUrl: product.websiteUrl,
    websiteDomain: product.websiteDomain,
    logoUrl: product.logoUrl ?? null,
    owned: Boolean(product.ownerUserId),
    threshold: product.threshold,
    baseline: product.baseline,
    confirmedCount: product.confirmedCount,
    poolCapacity: product.poolCapacity,
    dropCount: product.dropCount,
    lastDropAt: product.lastDropAt ? product.lastDropAt.toISOString() : null,
    faqs: (product.faqs || []).map((f) => ({ q: f.q, a: f.a })),
  };
}

export function toPublicDrop(drop: IDrop | null): PublicDrop | null {
  if (!drop) return null;
  return {
    id: drop._id.toString(),
    number: drop.number,
    status: drop.status,
    capacity: drop.capacity,
    claimedCount: drop.claimedCount,
    remaining: Math.max(0, drop.capacity - drop.claimedCount),
    subscribersAtRelease: drop.subscribersAtRelease,
    releasedAt: drop.releasedAt ? drop.releasedAt.toISOString() : null,
    exhaustedAt: drop.exhaustedAt ? drop.exhaustedAt.toISOString() : null,
  };
}

// The hub: live drops first, then by demand. Small enough to sort in memory for a long
// while - a few hundred products is one query.
export async function listPublished(): Promise<{ product: PublicProduct; drop: PublicDrop | null; state: PageState }[]> {
  await dbConnect();
  const products = await Product.find({ status: PRODUCT_STATUS.published }).sort({ confirmedCount: -1, createdAt: -1 });
  const dropIds = products.map((p) => p.currentDropId).filter(Boolean) as Types.ObjectId[];
  const drops = dropIds.length ? await Drop.find({ _id: { $in: dropIds } }) : [];
  const byId = new Map(drops.map((d) => [d._id.toString(), d]));

  const rank: Record<PageState, number> = { live: 0, armed: 1, wanted: 2, sold_out: 1 };
  return products
    .map((p) => {
      const drop = p.currentDropId ? byId.get(p.currentDropId.toString()) ?? null : null;
      return { product: toPublicProduct(p), drop: toPublicDrop(drop), state: pageState(p, drop) };
    })
    .sort((a, b) => rank[a.state] - rank[b.state] || b.product.confirmedCount - a.product.confirmedCount);
}
