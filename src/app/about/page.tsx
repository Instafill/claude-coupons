import type { Metadata } from "next";
import Link from "next/link";

import { GUEST_PASS_DOC, SITE_URL } from "@/lib/seo";

const TITLE = "About - Claude Coupons";
const DESCRIPTION =
  "Why ClaudeCoupons.com exists: most Claude guest passes expire unused, and someone else is waiting for one. A 40-second film and how the queue works.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/about`,
    siteName: "Claude Coupons",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "https://i.ytimg.com/vi/owThOjlcZQo/maxresdefault.jpg", width: 1280, height: 720 }],
  },
};

export default function AboutPage() {
  return (
    <section className="mx-auto mt-8 max-w-2xl">
      <h1 className="text-[28px] font-bold">About ClaudeCoupons.com</h1>
      <p className="mt-2">
        Every Claude Pro and Max subscriber holds a few{" "}
        <a className="text-accent-dark underline" href={GUEST_PASS_DOC} rel="noopener">
          guest passes
        </a>{" "}
        - seven free days of Claude Pro, Claude Code included, for someone new to paid Claude.
        Most of them sit unused until they expire. Meanwhile plenty of people with a real idea
        have never tried Claude Code. This site connects the two.
      </p>

      {/* youtube-nocookie keeps YouTube from setting cookies until someone presses play. */}
      <figure className="mt-6">
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-line bg-paper">
          <iframe
            className="h-full w-full"
            src="https://www.youtube-nocookie.com/embed/owThOjlcZQo"
            title="Share your Claude pass"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        <figcaption className="mt-2 text-sm text-muted">
          Share your Claude pass - a 40-second hand-drawn film.
        </figcaption>
      </figure>

      <h2 className="mt-8 text-[20px] font-bold">How it works</h2>
      <ul className="mt-2 list-disc space-y-2 pl-5">
        <li>
          <strong>You list a pass.</strong> Paste your personal referral link on{" "}
          <Link className="text-accent-dark underline" href="/submit">
            Share a code
          </Link>
          . We keep only the code and rebuild the link ourselves, so nothing else can end up on
          the board.
        </li>
        <li>
          <strong>It goes to the next people in line.</strong> Anyone can{" "}
          <Link className="text-accent-dark underline" href="/">
            join the queue
          </Link>
          . A new pass is offered in small waves, first come first served, and each person
          tells us whether it worked - that is how dead links drop off.
        </li>
        <li>
          <strong>Someone gets to start.</strong> Seven days of Claude Pro to build the thing
          they have been putting off. If they stay on, Anthropic may give you a $10 usage
          credit - but the better part is that you helped someone begin.
        </li>
      </ul>

      <h2 className="mt-8 text-[20px] font-bold">More than Claude</h2>
      <p className="mt-2">
        The same queue now runs boards for other programs that reward the person using a code
        - Waymo, Uber, muse.ai, Fireflies and more. See them all on{" "}
        <Link className="text-accent-dark underline" href="/referral-codes">
          All codes
        </Link>
        .
      </p>

      <h2 className="mt-8 text-[20px] font-bold">Who runs it</h2>
      <p className="mt-2">
        ClaudeCoupons.com is a small independent project, built in the open - the{" "}
        <a
          className="text-accent-dark underline"
          href="https://github.com/Instafill/claude-coupons"
          rel="noopener"
        >
          source is on GitHub
        </a>
        . It is not affiliated with or endorsed by Anthropic. Questions or ideas?{" "}
        <a className="text-accent-dark underline" href="https://x.com/ogamaniuk" rel="noopener">
          Say hello on X
        </a>
        .
      </p>
    </section>
  );
}
