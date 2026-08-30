import type { Metadata } from "next";
import Link from "next/link";

// Where the confirm and stop links land. Not indexed and not in the sitemap: it says nothing
// useful to anyone who did not arrive from an email of ours.
export const metadata: Metadata = {
  title: "Pass alerts - Claude Coupons",
  robots: { index: false },
};

const STATES: Record<string, { heading: string; body: string }> = {
  confirmed: {
    heading: "You're watching the board",
    body: "We'll email you the next time the board goes from empty to having Claude guest passes. Nothing else, and never more than once every 12 hours. Every message carries a one-click link to stop.",
  },
  stopped: {
    heading: "You're not watching any more",
    body: "That address is off the list and won't hear from us about passes again. Nothing else changes - you can still unlock passes on the board, and you can start watching again any time the board is empty.",
  },
  invalid: {
    heading: "That link didn't work",
    body: "Confirmation links expire after seven days, and each one works only once. Head back to the board - if it's empty, you can ask for a fresh link there.",
  },
};

export default async function WatchPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  const { heading, body } = STATES[state ?? ""] ?? STATES.invalid;

  return (
    <section className="mx-auto mt-8 max-w-md">
      <h1 className="text-[28px] font-bold">{heading}</h1>
      <p className="mt-2 text-muted">{body}</p>
      <Link
        className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-white no-underline hover:bg-accent-dark"
        href="/"
      >
        Go to the board
      </Link>
    </section>
  );
}
