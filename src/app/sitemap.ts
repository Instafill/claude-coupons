import type { MetadataRoute } from "next";

import { getAllPosts } from "@/lib/blog";
import { OTHER_DEALS } from "@/lib/deals";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const blogPosts = getAllPosts();

  return [
    // No trailing slash, deliberately. Next strips it from the rendered canonical tag
    // (trailingSlash defaults to false), so a slash here submits one URL while the page
    // canonicalises to another - which is why the home page alone was reported twice.
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    // The other boards, straight from the registry: a deal that exists but is missing from
    // the sitemap is a page nobody finds, and that is not a mistake worth being able to make.
    ...OTHER_DEALS.map((deal) => ({
      url: `${SITE_URL}${deal.path}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    {
      url: `${SITE_URL}/referral-codes`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/blog`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...blogPosts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    {
      url: `${SITE_URL}/claude-guest-pass`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/claude-free-trial`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/elevenlabs-promo-code`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/submit`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/friends`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
