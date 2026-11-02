import type { Metadata } from "next";
import Link from "next/link";

import { peopleServed } from "@/lib/draw";
import { queueSize } from "@/lib/queue";
import { SITE_URL } from "@/lib/seo";
import { SPONSOR_CHECKOUT_URL, SPONSOR_EMAIL, SPONSOR_PRICE_USD, TRAFFIC } from "@/lib/sponsor";

// The page that sells the sponsorship (src/lib/sponsor.ts): the slots KitCut fills today, to one
// company at a time. The audience numbers are live from the database; the traffic is the
// Vercel snapshot in sponsor.ts, dated on the page so nobody reads it as live.

export const dynamic = "force-dynamic";

const TITLE = "Sponsor ClaudeCoupons.com - reach people trying Claude Pro";
const DESCRIPTION = `Sponsor the live Claude Pro draws and every page of ClaudeCoupons.com: ${TRAFFIC.last30.visitors.toLocaleString("en-US")} visitors a month, an email list invited to every draw. $${SPONSOR_PRICE_USD} a month, one sponsor at a time.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/sponsor` },
  openGraph: { type: "website", url: `${SITE_URL}/sponsor`, siteName: "Claude Coupons", title: TITLE, description: DESCRIPTION },
};

const fmt = (n: number) => n.toLocaleString("en-US");

const PLACEMENTS = [
  {
    title: "The banner at the top of every page",
    body: "Your headline, your pitch, a button, and up to four pictures or silent video clips, between the header and the page, on the home page, every code board and every blog post.",
  },
  {
    title: "Every live draw is yours",
    body: "“Live draw sponsored by you” sits at the top of every draw room, where people wait through the countdown, chat and watch the winners drawn.",
  },
  {
    title: "Every draw invite email",
    body: "The same sponsor line goes into the invite each person on the list gets before every draw, with your link.",
  },
  {
    title: "The bar that follows readers down",
    body: "A slim bar with your logo, headline and button stays at the foot of the screen as people scroll.",
  },
  {
    title: "The confirmation email and the footer",
    body: "A card with your pitch and pictures under every sign-up confirmation, and a line in the footer of every page.",
  },
  {
    title: "The draw videos on YouTube",
    body: "Each draw goes up on the Claude Coupons YouTube channel, with you named as the sponsor in its description.",
  },
];

const FAQ = [
  {
    q: "Who reads this site?",
    a: "People about to try a paid AI tool: developers and builders who want Claude Pro and Claude Code, mostly on desktop, mostly from the US, Singapore, Brazil, India and Europe. Most arrive from Reddit, from their draw invites in Gmail and from search.",
  },
  {
    q: "How soon does it go live?",
    a: "Within one working day of payment. Reply to the receipt with your logo, a headline, one line of pitch and the link, and pictures or short clips if you have them. We write nothing in your name you have not seen.",
  },
  {
    q: "Can someone else sponsor at the same time?",
    a: "No. One sponsor at a time takes every slot. Until a sponsor signs, they carry KitCut, our own product.",
  },
  {
    q: "How do I stop?",
    a: `It renews monthly and you can stop any time: email ${SPONSOR_EMAIL} and it ends with the month you have paid for.`,
  },
  {
    q: "Is there anything you will not run?",
    a: "We keep the right to turn down a sponsor that does not fit the readers: no gambling, no crypto schemes, nothing that pretends to be Anthropic, and no claims about Claude we cannot stand behind.",
  },
];

export default async function SponsorPage({ searchParams }: { searchParams: Promise<{ thanks?: string }> }) {
  const [{ thanks }, onList, served] = await Promise.all([searchParams, queueSize("claude"), peopleServed("claude")]);

  const buyHref =
    SPONSOR_CHECKOUT_URL ||
    `mailto:${SPONSOR_EMAIL}?subject=${encodeURIComponent("ClaudeCoupons.com sponsorship")}`;

  const max = Math.max(...TRAFFIC.daily);
  const W = 640;
  const H = 120;
  const bw = W / TRAFFIC.daily.length;

  return (
    <article className="mx-auto mt-4 max-w-3xl">
      {thanks && (
        <p className="mb-6 rounded-xl border border-good/30 bg-[#eaf6ef] px-4 py-3 font-semibold text-good">
          Thank you - you are the sponsor. Reply to the Stripe receipt with your logo, headline, pitch and link, and it goes
          live within one working day.
        </p>
      )}

      <p className="text-[12px] font-semibold tracking-wider text-accent-dark uppercase">Sponsor ClaudeCoupons.com</p>
      <h1 className="mt-2 text-[32px] leading-[1.15] font-bold sm:text-[40px]">
        Be the brand people see while they wait for <span className="text-accent">Claude Pro</span>.
      </h1>
      <p className="mt-4 text-[17px] text-muted">
        Every week people come here for a free week of Claude Pro, sign up to the list and gather in a live room to watch the
        winners drawn. One sponsor has the whole site to itself: the top of every page, every draw, every invite email.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { n: fmt(TRAFFIC.last30.visitors), l: "visitors in the last 30 days" },
          { n: fmt(TRAFFIC.last30.pageviews), l: "page views in the last 30 days" },
          { n: fmt(onList), l: "people on the draw list, each invited to every draw" },
          { n: fmt(served), l: "people who got a week of Claude Pro here" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-line bg-surface p-4">
            <dt className="sr-only">{s.l}</dt>
            <dd>
              <span className="block text-[28px] leading-none font-bold text-accent tabular-nums">{s.n}</span>
              <span className="mt-2 block text-[13px] leading-snug text-muted">{s.l}</span>
            </dd>
          </div>
        ))}
      </dl>

      <section className="mt-6 rounded-xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[16px] font-bold">Visitors a day, last two months</h2>
          <p className="text-[12px] text-muted">
            {fmt(TRAFFIC.last61.visitors)} visitors, {fmt(TRAFFIC.last61.pageviews)} page views
          </p>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-3 h-auto w-full"
          role="img"
          aria-label={`Visitors a day from ${TRAFFIC.dailyFrom} to ${TRAFFIC.takenOn}: from about 100 a day in early September to ${fmt(TRAFFIC.daily[TRAFFIC.daily.length - 1])} on ${TRAFFIC.takenOn}.`}
        >
          {TRAFFIC.daily.map((v, i) => {
            const h = Math.max(2, (v / max) * (H - 4));
            return (
              <rect key={i} x={i * bw + 1} y={H - h} width={Math.max(1, bw - 2)} height={h} rx={1.5} className="fill-accent">
                <title>{`${fmt(v)} visitors`}</title>
              </rect>
            );
          })}
        </svg>
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          <span>Sep 2</span>
          <span>Nov 1</span>
        </div>
        <p className="mt-3 text-[13px] text-muted">
          Top countries, last 30 days:{" "}
          {TRAFFIC.countries
            .slice(0, 6)
            .map((c) => `${c.name} ${fmt(c.visitors)}`)
            .join(" · ")}
          . {Math.round(TRAFFIC.last30.desktopShare * 100)}% on desktop.
        </p>
        <p className="mt-1 text-[11px] text-muted">
          Vercel Web Analytics, production traffic with bots excluded, as of {TRAFFIC.takenOn}. The list and Claude Pro
          numbers above are live.
        </p>
      </section>

      <h2 className="mt-10 text-[22px] font-bold">What the sponsor gets</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {PLACEMENTS.map((p) => (
          <li key={p.title} className="rounded-xl border border-line bg-surface p-4">
            <p className="font-semibold">{p.title}</p>
            <p className="mt-1 text-[14px] text-muted">{p.body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-muted">
        See it working now: KitCut fills every slot today. Look at the{" "}
        <Link href="/" className="text-accent-dark underline">
          home page
        </Link>{" "}
        and its banner.
      </p>

      <section className="mt-10 rounded-2xl border-2 border-accent bg-surface p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[12px] font-semibold tracking-wider text-accent-dark uppercase">One sponsor at a time</p>
            <p className="mt-1 text-[40px] leading-none font-bold">
              ${SPONSOR_PRICE_USD}
              <span className="text-[18px] font-semibold text-muted"> / month</span>
            </p>
            <p className="mt-2 text-[14px] text-muted">Every slot above. Monthly, stop any time. Live within one working day.</p>
          </div>
          <a
            href={buyHref}
            rel="noopener"
            className="inline-flex w-fit flex-none items-center gap-1.5 rounded-lg bg-accent px-6 py-3 text-[17px] font-semibold text-white no-underline transition-colors hover:bg-accent-dark"
          >
            Become the sponsor <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
        <p className="mt-4 text-[12px] text-muted">
          Paid securely through Stripe. Questions first?{" "}
          <a className="text-accent-dark underline" href={`mailto:${SPONSOR_EMAIL}`}>
            {SPONSOR_EMAIL}
          </a>
        </p>
      </section>

      <h2 className="mt-10 text-[22px] font-bold">Questions</h2>
      <dl className="mt-4 space-y-5">
        {FAQ.map((f) => (
          <div key={f.q}>
            <dt className="font-semibold">{f.q}</dt>
            <dd className="mt-1 text-muted">{f.a}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
