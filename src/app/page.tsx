import type { Metadata } from "next";
import Link from "next/link";

import DrawHero from "@/components/DrawHero";
import LastDraw from "@/components/LastDraw";
import ShareCard from "@/components/ShareCard";
import ShareCta from "@/components/ShareCta";
import { getUser } from "@/lib/auth";
import { OTHER_DEALS, getDeal } from "@/lib/deals";
import { drawSummary, peopleServed } from "@/lib/draw";
import { FAQS } from "@/lib/faqs";
import { HOME_FRIENDS } from "@/lib/friends";
import { ensureQueueAdopted, joinedToday, standingFor } from "@/lib/queue";

// The Claude board, and the page that ranks. Its copy is tuned against real queries and is
// deliberately not generated from lib/deals.ts like the other boards are - the machinery is
// shared, the words are not.
const DEAL = getDeal("claude");

export const dynamic = "force-dynamic";

const TITLE = "Claude Code Passes | Claude Coupons";
const DESCRIPTION =
  "Claude coupons that actually work: free Claude Code passes, each a week of Claude Pro. Anthropic issues no Claude Code coupon or promo codes, so a guest pass is the real Claude AI coupon - claim one or share yours.";

const SOCIAL_TITLE = "Free Claude Code passes, plus referral codes for Uber, Waymo and more";
const SOCIAL_DESCRIPTION =
  "Claim a free week of Claude Pro, Claude Code included, from a pass someone would let expire - or share yours. Plus referral codes for Uber, Waymo, ChatGPT, KitCut, Fireflies, Pokémon GO and muse.ai.";
const SOCIAL_IMAGE_ALT =
  "Claude Code passes: a free week of Claude Pro, plus referral codes for Uber, Waymo, ChatGPT, KitCut, Fireflies, Pokémon GO and muse.ai";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://claudecoupons.com" },
  keywords: [
    "claude coupons",
    "claude coupon",
    "claude passes",
    "claude code passes",
    "claude code coupon",
    "claude ai coupon",
    "claude ai pass",
    "claude pass",
    "redeem claude coupon",
    "claude groupon",
    "claude promo code",
  ],
  // The social card says what the page holds now, not only the Claude board it started as.
  // The <title> and description above stay tuned for search; these are for a shared link.
  openGraph: {
    type: "website",
    url: "https://claudecoupons.com/",
    siteName: "Claude Coupons",
    title: SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
    images: [
      { url: "/og-home.png", width: 1200, height: 630, alt: SOCIAL_IMAGE_ALT },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
    images: [{ url: "/og-home.png", alt: SOCIAL_IMAGE_ALT }],
  },
};

// The four steps, from the list to a working pass. Short enough to read in passing.
const HOW = [
  {
    title: "Join the list",
    body: "Leave your email and confirm it once. No password, and nothing to pay.",
  },
  {
    title: "Get the invite",
    body: "When subscribers share passes, everyone on the list is emailed a link to the draw room.",
  },
  {
    title: "Be in the room",
    body: "Join with your first name. Winners are drawn live, everyone with the same chance, and you can chat while you wait.",
  },
  {
    title: "Claim your week",
    body: "Win and you have a minute to press Get my pass. Open the link on claude.ai and the 7 free days start.",
  },
];

const GUEST_PASS_DOC =
  "https://support.claude.com/en/articles/13456702-claude-code-and-cowork-guest-passes";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ watch?: string }>;
}) {
  const { watch } = await searchParams;
  const user = await getUser();
  // Before any standing is read: somebody holding a number from before the boards existed
  // would otherwise be shown the join form and quietly lose their place in line.
  await ensureQueueAdopted();
  // Every number the card shows comes from here. Nothing on it is a constant. Claude passes
  // are given out in live draws (lib/draw.ts), so the board is the draw, not a list of codes.
  const [summary, served, today, standing] = await Promise.all([
    drawSummary(DEAL.slug, user?.email),
    peopleServed(DEAL.slug),
    joinedToday(DEAL.slug),
    user ? standingFor(user.email, DEAL.slug) : Promise.resolve(null),
  ]);

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Claude Coupons",
      url: "https://claudecoupons.com",
      description: DESCRIPTION,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ];

  return (
    <>
      {schema.map((entry, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
        />
      ))}

      <section className="pt-4">
        {/* Carries three target phrases at once - "claude code passes", "claude coupons"
            and, via the domain form, "claude ai coupon". */}
        <h1 className="text-[24px] leading-tight font-bold text-muted">
          Claude Code Passes | Claude.ai Coupons
        </h1>
      </section>

      {/* The whole ask on one screen: the number that proves it works, the promise, and the
          form - or, on a draw day, the way into the room. */}
      <div className="mt-6">
        <DrawHero
          deal={DEAL}
          summary={summary}
          served={served}
          joinedToday={today}
          onList={Boolean(standing)}
          signedIn={Boolean(user)}
          email={user?.email}
          confirmed={watch === "confirmed"}
        />
      </div>

      <section className="mt-12">
        <h2 className="text-[26px] leading-tight font-bold">How a live draw works</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW.map(({ title, body }, i) => (
            <li key={title} className="rounded-2xl border border-line bg-surface px-5 py-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[15px] font-bold text-white">
                {i + 1}
              </span>
              <p className="mt-3 text-[17px] font-semibold">{title}</p>
              <p className="mt-1 text-[14px] text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-12 grid items-stretch gap-8 lg:grid-cols-2">
        {summary.last ? <LastDraw last={summary.last} /> : null}
        <ShareCard deal={DEAL} />
      </div>

      <ShareCta deal={DEAL} />

      <section className="mt-14 max-w-3xl [&_h2]:mt-9 [&_h2]:mb-2.5 [&_h2]:text-[23px] [&_h2]:font-semibold">
        <h2>What you get with a Claude Code pass</h2>
        <p className="mb-3">
          A pass is 7 free days of Claude Pro, shared by a subscriber who would otherwise let it
          expire. Each link is good for three people, so each one becomes three winners in a draw.
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>7 days of Claude Pro, free</strong> - the full paid plan,
            not a limited demo.
          </li>
          <li>
            <strong>Claude Code</strong> - the agentic coding tool in your
            terminal and IDE.
          </li>
          <li>
            <strong>Cowork</strong> - Claude working alongside you on files and
            everyday tasks.
          </li>
          <li>
            Higher usage limits and access to Anthropic&rsquo;s latest models
            while the pass runs.
          </li>
        </ul>

        <h2>Is there a Claude coupon or Claude Code coupon code?</h2>
        <p>
          People search for Claude coupons, a Claude Code coupon, a Claude AI
          coupon, a Claude promo code, a Claude Pro discount - and the honest
          answer is that{" "}
          <strong>Anthropic doesn&rsquo;t issue any of them</strong>. There is
          no code to type at checkout, no seasonal sale and no student rate.
          What exists instead is the{" "}
          <Link
            className="text-accent-dark underline"
            href="/claude-guest-pass"
          >
            Claude guest pass
          </Link>{" "}
          program: eligible Pro and Max subscribers hold a few personal invites,
          each worth a free week of Claude Pro for someone new. Sharing one can
          open the door for someone who otherwise would not get to try it. Most
          of those passes expire unshared; this board helps put them in the
          hands of people who can use them. A Claude pass from this board is the
          closest thing to a Claude coupon that actually works.
        </p>

        <h2>How to redeem a Claude coupon</h2>
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            <strong>Take a number</strong> with your email - no password to
            invent.
          </li>
          <li>
            <strong>Win a spot in a live draw.</strong> When passes come in,
            everyone in line gets an email invite to a draw a few minutes later.
            Be in the room when it starts; if you win, press Get my pass to
            reveal its claude.ai invite link.
          </li>
          <li>
            <strong>Redeem it on claude.ai</strong> - open the link and create
            your account there. The 7-day Claude Pro trial starts on
            Anthropic&rsquo;s side, never here.
          </li>
          <li>
            <strong>Tell us if it worked.</strong> Your one-click answer retires
            exhausted links for everyone after you.
          </li>
        </ol>

        <h2>Who can use a Claude Code pass</h2>
        <p>
          Passes only apply to people <strong>new to paid Claude</strong>.
          Anthropic asks for a payment card at signup, and unless you cancel
          within the 7 days the account becomes a regular paid Claude Pro
          subscription. Passes are limited per subscriber and first-come,
          first-served, so a listed link can be exhausted before everyone it
          was drawn for has used it. All program rules are Anthropic&rsquo;s - see the{" "}
          <a
            className="text-accent-dark underline"
            href={GUEST_PASS_DOC}
            rel="noopener"
          >
            official guest pass page
          </a>
          , or our plain-English guide to{" "}
          <Link
            className="text-accent-dark underline"
            href="/claude-guest-pass"
          >
            how a Claude guest pass works
          </Link>
          .
        </p>

        <h2>Other referral codes on this board</h2>
        <p>
          The same queue runs for a few other programs, each one a code its owner would
          otherwise let expire; those are offered down the line a few people at a time rather
          than drawn. Every one of them pays the person who claims it:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6">
          {OTHER_DEALS.map((deal) => (
            <li key={deal.slug}>
              <Link className="text-accent-dark underline" href={deal.path}>
                {deal.name} {deal.nounPlural}
              </Link>{" "}
              - {deal.reward}.
            </li>
          ))}
        </ul>
        <p>
          <Link className="text-accent-dark underline" href="/referral-codes">
            See every board and what is live right now
          </Link>
          .
        </p>

        <h2 id="faq">Claude coupon and pass questions, answered</h2>
        <dl>
          {FAQS.map(({ q, a }) => (
            <div key={q}>
              <dt className="mt-4 font-semibold">{q}</dt>
              <dd className="mt-1">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-[22px] leading-tight font-bold">From our friends</h2>
          <Link className="text-[14px] text-accent-dark underline" href="/friends">
            All our friends &rarr;
          </Link>
        </div>
        <p className="mt-1 text-[14px] text-muted">
          A few things we or people we know built, some of them for Claude Code users.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HOME_FRIENDS.map(({ name, url, line }) => (
            <li
              key={url}
              className="rounded-xl border border-line bg-surface px-4 py-4 transition-colors hover:border-accent"
            >
              <a className="text-[16px] font-bold text-accent-dark underline" href={url} rel="noopener">
                {name}
              </a>
              <p className="mt-1 text-[14px] text-muted">{line}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
