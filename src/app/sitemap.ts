import type { MetadataRoute } from "next";

import { dbConnect } from "@/lib/mongodb";
import Product, { PRODUCT_STATUS } from "@/models/Product";

// Metadata routes sit outside the cookie-reading layout, so this one can cache.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed: MetadataRoute.Sitemap = [
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
      url: "https://claudecoupons.com/claude-free-trial",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://claudecoupons.com/coupons",
      changeFrequency: "daily",
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

  // Archived pages are left out: they answer 404, and a sitemap that lists them would
  // keep asking Google to crawl a page that says nothing.
  let products: { slug: string; updatedAt: Date }[] = [];
  try {
    await dbConnect();
    products = await Product.find({ status: PRODUCT_STATUS.published })
      .select("slug updatedAt")
      .sort({ confirmedCount: -1 })
      .lean();
  } catch (error) {
    console.error("Sitemap could not list products:", error);
  }

  return [
    ...fixed,
    ...products.map((product) => ({
      url: `https://claudecoupons.com/coupons/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
