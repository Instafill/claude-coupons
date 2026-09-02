import type { Metadata } from "next";

import type { PageState, Progress, PublicDrop, PublicProduct } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";

// Titles, descriptions, FAQ and structured data for a product page. Every phrase here is
// built from what is true right now - how many are waiting, whether a drop is live - so
// the page stays fresh without a date stamp and never claims an offer that does not exist.

export function productPath(slug: string): string {
  return `/coupons/${slug}`;
}

export function productUrl(slug: string): string {
  return `${SITE_URL}${productPath(slug)}`;
}

export interface OfferSummary {
  count: number; // codes loaded for the next drop, or live in the current one
  labels: string[]; // distinct offer labels, e.g. "50% off first year"
}

function liveFact(product: PublicProduct, drop: PublicDrop | null, state: PageState, progress: Progress, offer: OfferSummary): string {
  if (state === "live" && drop) return `${drop.remaining} of ${drop.capacity} codes left`;
  if (state === "sold_out" && drop) return `drop #${drop.number} sold out, next one at ${progress.threshold}`;
  if (offer.count > 0) return `${offer.count} codes loaded, ${progress.n} waiting`;
  if (!product.owned) return progress.n > 0 ? `${progress.n} people asking, no drop yet` : "no drop yet";
  return progress.n > 0 ? `${progress.n} of ${progress.threshold} waiting` : `${progress.threshold} people unlock the drop`;
}

export function productTitle(product: PublicProduct, drop: PublicDrop | null, state: PageState, progress: Progress, offer: OfferSummary): string {
  const fact = liveFact(product, drop, state, progress, offer);
  const kind = state === "live" ? "coupon drop live" : state === "wanted" ? "coupons" : "coupon drop";
  return `${product.name} ${kind}: ${fact} | Claude Coupons`;
}

export function productDescription(product: PublicProduct, drop: PublicDrop | null, state: PageState, progress: Progress, offer: OfferSummary): string {
  const lead =
    state === "live" && drop
      ? `${product.name} codes are live: ${drop.remaining} of ${drop.capacity} left, first come first served.`
      : product.owned
        ? offer.count > 0
          ? `${offer.count} ${product.name} codes drop to the list at ${progress.threshold} subscribers - ${progress.n} waiting so far.`
          : `${product.name} releases coupon codes to this list once ${progress.threshold} people are waiting - ${progress.n} so far.`
        : `${progress.n} people have asked for a ${product.name} coupon. Join the list and the makers are told how many are waiting.`;
  return `${lead} ${product.tagline}`.slice(0, 300);
}

export function productMetadata(args: { product: PublicProduct; drop: PublicDrop | null; state: PageState; progress: Progress; offer: OfferSummary }): Metadata {
  const { product } = args;
  const title = productTitle(args.product, args.drop, args.state, args.progress, args.offer);
  const description = productDescription(args.product, args.drop, args.state, args.progress, args.offer);
  const url = productUrl(product.slug);
  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [
      `${product.name} coupon`,
      `${product.name} coupon code`,
      `${product.name} promo code`,
      `${product.name} discount`,
      `${product.name} free trial`,
      `${product.name} deal`,
    ],
    openGraph: {
      type: "website",
      url,
      siteName: "Claude Coupons",
      title,
      description,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: `${product.name} coupon drop` }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

// The questions every product page answers. Merged with the product's own FAQ so the
// page always has a FAQPage block, and each answer is true of the mechanics, not a promise
// about a specific offer.
export function templateFaqs(product: PublicProduct, progress: Progress): { q: string; a: string }[] {
  const who = product.owned ? `${product.name}'s team` : "the makers";
  return [
    {
      q: `Is there a ${product.name} coupon code?`,
      a: product.owned
        ? `Yes, when ${product.name} releases a drop here. Codes come from ${product.name} itself and are handed out first come, first served to the people on this list. There are fewer codes than people waiting, so the order you join in matters.`
        : `Not yet. This page collects requests: ${progress.n} people have asked so far. Once ${who} claim the page and load codes, everyone on the list is emailed at the same moment and the codes go first come, first served.`,
    },
    {
      q: "How does a coupon drop work?",
      a: `Codes are released to the list once ${progress.threshold} people are waiting, or earlier if ${who} choose. Everyone on the list gets one email at the same second with a claim link. Each person can claim one code; when the codes are gone, the drop is over and the counter restarts for the next one.`,
    },
    {
      q: "What if I miss the drop?",
      a: "You stay on the list for the next drop. Nothing else happens - no other email, and your address is never shared with anyone, including the product's makers.",
    },
    {
      q: "Is this an official page?",
      a: product.owned
        ? `${product.name}'s team has claimed this page and the codes on it are theirs. Claude Coupons only keeps the list and sends the drop email.`
        : `No. Claude Coupons set this page up so people could ask ${product.name} for a deal in one place. The makers can claim it below; until they do, no codes are promised.`,
    },
    {
      q: "How do I stop the emails?",
      a: "Every email carries a one-click stop link. Press it and that address is off this list; nothing else changes.",
    },
  ];
}

export function productJsonLd(args: {
  product: PublicProduct;
  drop: PublicDrop | null;
  state: PageState;
  faqs: { q: string; a: string }[];
  description: string;
  offer: OfferSummary;
}): Record<string, unknown>[] {
  const { product, drop, state, faqs, description, offer } = args;
  const url = productUrl(product.slug);
  const entries: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Claude Coupons", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Coupons", item: `${SITE_URL}/coupons` },
        { "@type": "ListItem", position: 3, name: product.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${product.name} coupons and deal drops`,
      url,
      description,
      about: { "@type": "SoftwareApplication", name: product.name, url: product.websiteUrl },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ];
  // An Offer is emitted only while a real code can be claimed. A page that advertises an
  // offer it cannot hand out is the doorway page this site refuses to be.
  if (state === "live" && drop && drop.remaining > 0) {
    entries.push({
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.tagline,
      url: product.websiteUrl,
      offers: {
        "@type": "Offer",
        url,
        name: offer.labels[0] ?? `${product.name} coupon`,
        availability: "https://schema.org/LimitedAvailability",
        inventoryLevel: { "@type": "QuantitativeValue", value: drop.remaining },
      },
    });
  }
  return entries;
}
