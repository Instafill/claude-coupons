import { NextResponse, type NextRequest } from "next/server";

// Nothing for Russia or Belarus, nor Russian crawlers (owner, 2026-11-18). The Cloudflare Worker in edge-worker/ refuses
// them first; this covers a request that reaches Vercel directly. Behind Cloudflare, x-vercel-ip-country places
// Cloudflare rather than the visitor, so both headers are read. A forged header can only lock its sender out.
const BLOCKED_COUNTRIES = new Set(["RU", "BY"]);
const RU_BOTS = /yandex|yadirectfetcher|yanews|mail\.ru|vkshare|vkrobot|odklbot|odnoklassniki|rambler|sputnik(image)?bot|megaindex|linkpad/i;

export function proxy(request: NextRequest) {
  const h = request.headers;
  const bot = RU_BOTS.test(h.get("user-agent") ?? "");
  const blockedCountry = [h.get("cf-ipcountry"), h.get("x-vercel-ip-country")].some((c) =>
    BLOCKED_COUNTRIES.has((c ?? "").toUpperCase()),
  );
  if ((bot && request.nextUrl.pathname !== "/robots.txt") || blockedCountry) {
    return new NextResponse("This site is not available in your region.", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
