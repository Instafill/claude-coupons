import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://claudecoupons.com/", changeFrequency: "daily", priority: 1 },
    { url: "https://claudecoupons.com/submit", changeFrequency: "monthly", priority: 0.6 },
    { url: "https://claudecoupons.com/friends", changeFrequency: "monthly", priority: 0.4 },
  ];
}
