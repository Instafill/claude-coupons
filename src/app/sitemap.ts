import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // No trailing slash, deliberately. Next strips it from the rendered canonical tag
    // (trailingSlash defaults to false), so a slash here submits one URL while the page
    // canonicalises to another - which is why the home page alone was reported twice.
    {
      url: "https://claudecoupons.com",
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://claudecoupons.com/claude-guest-pass",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://claudecoupons.com/submit",
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: "https://claudecoupons.com/friends",
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
