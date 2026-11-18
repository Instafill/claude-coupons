// Nothing for Russia or Belarus (owner, 2026-11-18: "forbid access from russia and belarus ... block russian bots like
// yandex on all levels"). Visitors by Cloudflare's country, crawlers by user agent and by network (ASN), wherever they
// run. src/proxy.ts repeats the check on the Vercel origin and src/app/robots.ts tells the crawlers to stay out.
const BLOCKED_COUNTRIES = new Set(["RU", "BY"]);
const BLOCKED_ASNS = new Set([13238, 200350, 47764, 47541, 47542]); // Yandex, Yandex.Cloud, Mail.ru / VK, VKontakte
const RU_BOTS = /yandex|yadirectfetcher|yanews|mail\.ru|vkshare|vkrobot|odklbot|odnoklassniki|rambler|sputnik(image)?bot|megaindex|linkpad/i;

export default {
  async fetch(request, env, ctx) {
    ctx.passThroughOnException(); // a fault here must never take the site down
    const cf = request.cf || {};
    const bot = RU_BOTS.test(request.headers.get("user-agent") || "") || BLOCKED_ASNS.has(Number(cf.asn));
    const robots = new URL(request.url).pathname === "/robots.txt";
    if ((bot && !robots) || BLOCKED_COUNTRIES.has(cf.country)) {
      return new Response("This site is not available in your region.", {
        status: 403,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }
    return fetch(request);
  },
};
