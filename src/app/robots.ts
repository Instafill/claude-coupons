import type { MetadataRoute } from "next";

// Russian search engines and crawlers are not welcome; src/proxy.ts and edge-worker/ also refuse them.
const RU_CRAWLERS = [
  "Yandex",
  "YandexBot",
  "YandexImages",
  "YandexMobileBot",
  "YandexMetrika",
  "YandexDirect",
  "YaDirectFetcher",
  "Mail.RU_Bot",
  "StackRambler",
  "SputnikBot",
  "MegaIndex.ru",
  "LinkpadBot",
  "OdklBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: RU_CRAWLERS, disallow: "/" },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/signin", "/manage", "/watch"],
      },
    ],
    sitemap: "https://claudecoupons.com/sitemap.xml",
  };
}
