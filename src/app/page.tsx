import type { Metadata } from "next";
import Link from "next/link";

import Board from "@/components/Board";
import ShareCard from "@/components/ShareCard";
import ShareCta from "@/components/ShareCta";
import { getUser } from "@/lib/auth";
import { FAQS } from "@/lib/faqs";
import {
  MAX_CLAIMS_PER_PASS,
  UNLOCKS_PER_USER_PER_DAY,
  getBoard,
} from "@/lib/passes";

export const dynamic = "force-dynamic";

const TITLE = "Claude Code Passes | Claude Coupons";
const DESCRIPTION =
  "Claude coupons that actually work: free Claude Code passes, each a week of Claude Pro. Anthropic issues no Claude Code coupon or promo codes, so a guest pass is the real Claude AI coupon - claim one or share yours.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://claudecoupons.com/" },
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
  openGraph: {
    type: "website",
    url: "https://claudecoupons.com/",
    siteName: "Claude Coupons",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      { url: "/og.png", width: 1200, height: 630, alt: "Claude Code Coupons" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

const GUEST_PASS_DOC =
  "https://support.claude.com/en/articles/13456702-claude-code-and-cowork-guest-passes";

export default async function Home() {
  const user = await getUser();
  const passes = await getBoard(user?.id ?? null);

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

      <section className="pt-7 pb-2">
        {/* Carries three target phrases at once - "claude code passes", "claude coupons"
            and, via the domain form, "claude ai coupon". */}
        <h1 className="text-[38px] leading-tight font-bold">
          Claude Code Passes | Claude.ai Coupons
        </h1>
        <p className="mt-3 max-w-2xl text-[19px] text-muted">
          A Claude pass gives you <strong>7 days of Claude Pro for free</strong>{" "}
          - Claude Code and Cowork included. If you subscribe, sharing a pass
          can give someone who cannot afford Claude Pro the chance to learn,
          build, and experience what it can do. This board turns spare passes
          into opportunities instead of letting them expire unused.
        </p>
      </section>

      {/* Both sides of the exchange get the first screen: claimers on the left, the
          subscribers who supply the passes on the right. */}
      {/* Keep each panel at its natural height. The pass list can grow independently without
          stretching the contributor card and leaving a large empty gap inside it. */}
      <div className="mt-9 grid items-start gap-8 lg:grid-cols-2">
        <section className="flex flex-col rounded-2xl border border-line bg-surface px-6 py-7">
          <h2 className="mb-4 text-2xl font-semibold">
            Available Claude passes
          </h2>
          <Board
            passes={passes}
            signedIn={Boolean(user)}
            maxClaims={MAX_CLAIMS_PER_PASS}
            dailyCap={UNLOCKS_PER_USER_PER_DAY}
          />
        </section>

        <ShareCard />
      </div>

      <ShareCta />

      <section className="mt-14 max-w-3xl [&_h2]:mt-9 [&_h2]:mb-2.5 [&_h2]:text-[23px] [&_h2]:font-semibold">
        <h2>What you get with a Claude Code pass</h2>
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
            <strong>Sign in</strong> with Google or your email - no password to
            invent.
          </li>
          <li>
            <strong>Unlock a Claude pass</strong> on the board to reveal its
            claude.ai invite link.
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
          first-served, so a listed link can be exhausted before anyone reports
          it. All program rules are Anthropic&rsquo;s - see the{" "}
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
    </>
  );
}
