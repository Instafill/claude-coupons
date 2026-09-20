import type { Metadata } from "next";
import Link from "next/link";

import Article, { type Fact, FactTable } from "@/components/Article";
import { articleMetadata } from "@/lib/seo";

// ElevenLabs has no board, on purpose.
//
// Every other brand on this site pays the person who claims a code: $10 off a Waymo ride,
// 50% off two Uber trips, a billion Muse tokens, 100 Poké Balls, 10% off Fireflies. Nothing
// in ElevenLabs' affiliate guide, affiliate terms or partner page gives the person clicking
// the link anything at all - the 22% goes to the sharer. A queue for that would be a queue
// for nothing, dressed as a coupon.
//
// So this page answers the query honestly and sends people to the free tier, which is the
// real thing an ElevenLabs searcher can have today. If ElevenLabs ever attaches a discount
// to referred signups, this becomes a Deal in lib/deals.ts like the rest.

const DESCRIPTION =
  "There is no public ElevenLabs promo code. What exists: a free tier you can use today, annual billing, and an affiliate program that pays the sharer rather than you. The honest version.";

const PATH = "/elevenlabs-promo-code";

export const metadata: Metadata = articleMetadata({
  title: "ElevenLabs Promo Code: The Honest Answer | Claude Coupons",
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "elevenlabs promo code",
    "elevenlabs coupon code",
    "elevenlabs discount code",
    "elevenlabs referral code",
    "elevenlabs affiliate link",
    "elevenlabs free credits",
    "elevenlabs discount",
    "elevenlabs coupon",
  ],
  imageAlt: "ElevenLabs promo codes",
});

const FACTS: Fact[] = [
  {
    term: "Public promo code",
    def: "None. ElevenLabs publishes no coupon codes and runs no public discount codes.",
  },
  {
    term: "What an affiliate link gives you",
    def: "Nothing extra. The commission goes to the affiliate, not to the person signing up.",
  },
  {
    term: "What the affiliate earns",
    def: "22% of payments on Starter, Creator, Pro and Scale for 12 months; 11% on Business.",
  },
  {
    term: "Free tier",
    def: "Yes - a free plan with a monthly credit allowance, no card and no code needed.",
  },
  {
    term: "Real way to pay less",
    def: "Annual billing, and choosing the smallest tier that covers your credits.",
  },
  {
    term: "Codes on coupon sites",
    def: "Expired, invented, or an affiliate link with the word 'code' printed next to it.",
  },
];

export default function ElevenLabsPage() {
  return (
    <Article
      h1="ElevenLabs promo code: the honest answer"
      description={DESCRIPTION}
      path={PATH}
      faqHeading="ElevenLabs discount questions"
      faqs={[
        {
          q: "Is there an ElevenLabs promo code?",
          a: "No public one. ElevenLabs does not publish coupon codes or run public discount codes, so the codes listed on aggregator sites are expired, invented, or affiliate links relabelled as codes. The free tier is the real way to use ElevenLabs without paying.",
        },
        {
          q: "Do I get a discount for using someone's ElevenLabs referral link?",
          a: "No. ElevenLabs runs an affiliate program, not a two-sided referral: the affiliate earns 22% of your payments for 12 months, and nothing in its affiliate guide, terms or partner page gives the person signing up a discount, free month or extra credits.",
        },
        {
          q: "How do I get free ElevenLabs credits?",
          a: "Use the free plan. It comes with a monthly credit allowance, needs no payment card and needs no code. When you run out, credits reset the following month.",
        },
        {
          q: "What is the cheapest way to pay for ElevenLabs?",
          a: "Bill annually rather than monthly, and pick the smallest tier that covers the credits you actually use. Measure a month on the free plan first - most people overestimate how many credits they need.",
        },
        {
          q: "Why does this site list Waymo and Uber codes but not ElevenLabs?",
          a: "Because those programs pay the person claiming the code, and ElevenLabs' does not. A queue for a link that gives you nothing would be a queue for nothing. If ElevenLabs ever attaches a discount to referred signups, it gets a board here like the rest.",
        },
      ]}
      cta={{
        heading: "Codes that do pay you",
        body: "Waymo, Uber, muse.ai, Pokémon GO, Fireflies.ai and Claude all give the person claiming the code something real. Those are on the board.",
        label: "See codes that work",
      }}
      lead={
        <>
          <p>
            There is no ElevenLabs promo code. Not an expired one, not a secret one - the
            company does not publish coupon codes at all, which is why every list of
            &ldquo;working ElevenLabs codes&rdquo; either fails at checkout or turns out to be
            somebody&rsquo;s affiliate link with the word code printed beside it.
          </p>
          <p>
            What does exist is worth knowing, so here it is plainly.
          </p>
        </>
      }
    >
      <FactTable
        rows={FACTS}
        note="Figures are ElevenLabs' own, from its affiliate guide and affiliate program page. Plan details change; check the pricing page before subscribing."
      />

      <h2>The affiliate link pays the sharer, not you</h2>
      <p>
        ElevenLabs runs a partner program through PartnerStack. An affiliate gets a link like{" "}
        <span className="font-mono text-[14px]">try.elevenlabs.io/…</span> and earns 22% of
        what you pay on Starter, Creator, Pro and Scale for your first twelve months, or 11% on
        Business. That is the entire mechanism.
      </p>
      <p>
        Read the guide and the terms and you will find no clause giving the person who clicks
        the link a discount, a free month or extra credits. So a site telling you to
        &ldquo;use our ElevenLabs referral link to save&rdquo; is describing its own earnings,
        not yours. Clicking it costs you nothing and saves you nothing.
      </p>

      <h2>What actually reduces the bill</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-6">
        <li>
          <strong>The free plan.</strong> A monthly credit allowance, no card, no code. For
          occasional voice work it is often the whole answer.
        </li>
        <li>
          <strong>Annual billing.</strong> The standard discount on every ElevenLabs paid tier,
          applied at checkout without a code.
        </li>
        <li>
          <strong>The right tier.</strong> Credits, not seats, are what you are buying. Spend a
          month on the free plan watching your usage before picking one.
        </li>
        <li>
          <strong>Student, startup and nonprofit programs.</strong> Where offered, these are
          applications rather than codes - ask ElevenLabs directly rather than hunting for a
          coupon.
        </li>
      </ul>

      <h2>Why we are telling you this instead of listing a code</h2>
      <p>
        This site exists to exchange referral codes that pay the person claiming them. A{" "}
        <Link className="text-accent-dark underline" href="/waymo-promo-code">
          Waymo code
        </Link>{" "}
        is $10 off a ride. An{" "}
        <Link className="text-accent-dark underline" href="/uber-promo-code">
          Uber code
        </Link>{" "}
        is half off two trips. A{" "}
        <Link className="text-accent-dark underline" href="/">
          Claude pass
        </Link>{" "}
        is a free week of Claude Pro. Each one is worth queueing for.
      </p>
      <p>
        An ElevenLabs affiliate link is worth queueing for only if you are the affiliate. We
        would rather say so than put a page in front of you that implies otherwise and collect
        the commission.
      </p>
    </Article>
  );
}
