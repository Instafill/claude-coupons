import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import LiveDrawClient from "@/components/draw/LiveDrawClient";
import { getUser } from "@/lib/auth";
import { placeForRequest, roomFor, seedFor } from "@/lib/draw";
import { KITCUT, kitcutUrl } from "@/lib/kitcut";

// A live draw's room. Invited people land here from the email (the link signs them in on the
// way); anyone else sees why they can't come in, and how to be invited next time.
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

  if (!view.viewer.invited && !view.viewer.spectator) {
    return (
      <section className="mx-auto mt-10 max-w-xl rounded-2xl border border-line bg-surface px-6 py-7">
        <p className="text-[12px] font-semibold tracking-wider text-accent-dark uppercase">Live draw</p>
        {user ? (
          <>
            <h1 className="mt-1 text-[28px] leading-tight font-bold">This draw is for the people invited to it</h1>
            <p className="mt-2 text-[16px] text-muted">
              Each draw invites the front of the line. Take a number and you move up as people are served; when
              you&rsquo;re near the front, the invite comes by email.
            </p>
            <Link
              href="/"
              className="mt-5 inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-dark"
            >
              Take a number
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-1 text-[28px] leading-tight font-bold">Open the link in your invite</h1>
            <p className="mt-2 text-[16px] text-muted">
              The button in your invite email brings you straight into the room. Or sign in with the address it was sent
              to.
            </p>
            <Link
              href={`/signin?return_to=/draw/${id}`}
              className="mt-5 inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-dark"
            >
              Sign in
            </Link>
          </>
        )}
      </section>
    );
  }

  // Whatever we already know goes into the join form, so joining can be one press. First
  // name only: the room shows nothing more.
  const firstName = user?.name?.trim().split(/\s+/)[0]?.slice(0, 20);
  const place = await placeForRequest(user!.email, await headers());
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
          Live draw sponsored by <strong className="font-semibold text-ink">KitCut.ai</strong>
          <span className="hidden sm:inline"> &middot; {KITCUT.headline}</span>
        </span>
        <span className="shrink-0 font-semibold text-accent-dark">{KITCUT.cta} &rarr;</span>
      </a>
      <LiveDrawClient
        initial={view}
        known={{ name: firstName, picture: user!.picture, seed: seedFor(id, user!.id) }}
        place={place}
      />
    </div>
  );
}
