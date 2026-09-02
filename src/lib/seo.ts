import type { Metadata } from "next";

/**
 * The canonical origin, and the one place a domain move happens. Everything that has to
 * name the site - canonicals, the sitemap, robots, JSON-LD, absolute links and the address
 * mail is sent from - derives from this, so moving the project to a new domain is one
 * environment variable rather than a search and replace across thirty files.
 *
 * Set NEXT_PUBLIC_SITE_URL to the new origin (scheme and host, no trailing slash). It is
 * NEXT_PUBLIC_ so a client component can use it too; nothing secret lives here.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://claudecoupons.com").replace(
  /\/+$/,
  ""
);

/** The bare host, for prose that names the site rather than linking it. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

/**
 * The address that both sends and receives. It has to stay on SITE_HOST - see the comment
 * in lib/sendgrid.ts - so it is derived rather than configured separately: a sender on one
 * domain and a site on another is the shape of a phishing mail, and filters score it that way.
 */
export const CONTACT_EMAIL = `hello@${SITE_HOST}`;

// Anthropic's guest pass article. Every page that makes a claim about the programme links
// it, so it lives here rather than being re-typed per page.
export const GUEST_PASS_DOC =
  "https://support.claude.com/en/articles/13456702-claude-code-and-cowork-guest-passes";

export interface ArticleSeo {
  title: string;
  description: string;
  /** Path with a leading slash. The canonical carries no trailing slash - Next strips it
      from the rendered tag, so the sitemap and these have to agree on the bare form. */
  path: string;
  keywords: string[];
  imageAlt: string;
}

/** One metadata shape for every article page, so a page only states what differs. */
export function articleMetadata({
  title,
  description,
  path,
  keywords,
  imageAlt,
}: ArticleSeo): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    keywords,
    openGraph: {
      type: "article",
      url,
      siteName: "Claude Coupons",
      title,
      description,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}
