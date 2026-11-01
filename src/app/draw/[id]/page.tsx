import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import LiveDrawClient from "@/components/draw/LiveDrawClient";
import { getUser } from "@/lib/auth";
import { placeForRequest, roomFor, seedFor } from "@/lib/draw";
import { KITCUT, kitcutUrl } from "@/lib/kitcut";

// A live draw's room. Invited people land here from the email (the link signs them in on the
// way) and can join; anyone else - late, or sent the link - watches it read-only.
export const metadata: Metadata = {
  title: "Live draw - Claude Coupons",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function DrawPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  const view = await roomFor(id, user);
  if (!view) notFound();

  // Whatever we already know goes into the join form, so joining can be one press. First
  // name only: the room shows nothing more.
  const firstName = user?.name?.trim().split(/\s+/)[0]?.slice(0, 20);
  const place = await placeForRequest(user?.email ?? "", await headers());
  return (
    // Wider than the site's reading column: the room and its chat use the screen, centred, never
    // wider than it (the 3rem leaves room for a scrollbar, so nothing scrolls sideways).
    <div id="draw-room" className="relative left-1/2 w-[min(1440px,calc(100vw-3rem))] -translate-x-1/2 pt-1">
      {/* The layout's KitCut banner and sticky bar would push the room below the fold and sit
          on top of it; on this page only, they step aside. */}
      <style>{`body:has(#draw-room) [aria-label="${KITCUT.label}"] { display: none; }`}</style>
      {/* In their place, one thin line: the draw's sponsor, which is our own other product. */}
      <a
        href={kitcutUrl("draw-room")}
        target="_blank"
        rel="noopener"
        className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] text-muted hover:border-accent hover:text-ink"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={KITCUT.logo} alt="" width={16} height={16} className="h-4 w-4 rounded-sm" />
        <span className="truncate">
          <span className="hidden sm:inline">Live draw sponsored</span>
          <span className="sm:hidden">Sponsored</span> by <strong className="font-semibold text-ink">KitCut.ai</strong>
          <span className="hidden sm:inline"> &middot; {KITCUT.headline}</span>
        </span>
        <span className="shrink-0 font-semibold text-accent-dark">
          <span className="hidden sm:inline">{KITCUT.cta} </span>&rarr;
        </span>
      </a>
      <LiveDrawClient
        initial={view}
        known={{ name: firstName, picture: user?.picture, seed: seedFor(id, user?.id ?? "watching") }}
        place={place}
      />
    </div>
  );
}
