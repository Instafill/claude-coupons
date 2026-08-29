import type { Metadata } from "next";

export const SITE_URL = "https://claudecoupons.com";

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
