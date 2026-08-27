import type { Metadata } from "next";

import Board from "@/components/Board";
import { getUser } from "@/lib/auth";
import { FAQS } from "@/lib/faqs";
import { MAX_CLAIMS_PER_PASS, UNLOCKS_PER_USER_PER_DAY, getBoard } from "@/lib/passes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Claude Coupons - Free Claude Code Passes (7 Days of Claude Pro)",
  description:
    "Claim a free Claude Code pass or share yours. Every Claude pass gives a new user 7 days of Claude Pro - Claude Code and Cowork included. There is no official Claude coupon code; guest passes are the real thing, exchanged here.",
  alternates: { canonical: "https://claudecoupons.com/" },
};

const GUEST_PASS_DOC =
  "https://support.claude.com/en/articles/13456702-claude-code-and-cowork-guest-passes";

export default async function Home() {
  const user = await getUser();
  const passes = await getBoard(user?.id ?? null);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="pt-7 pb-2">
        <h1 className="text-[38px] leading-tight font-bold">Free Claude Code Passes</h1>
        <p className="mt-3 max-w-xl text-[19px] text-muted">
          A Claude pass gives you <strong>7 days of Claude Pro for free</strong> - Claude Code
          and Cowork included. Subscribers get a few passes each and most go unused. This board
          is where spare passes meet the people looking for a Claude coupon.
        </p>
      </section>

      <section className="mt-9">
        <h2 className="mb-3.5 text-2xl font-semibold">Available passes</h2>
        <Board
          passes={passes}
          signedIn={Boolean(user)}
          maxClaims={MAX_CLAIMS_PER_PASS}
          dailyCap={UNLOCKS_PER_USER_PER_DAY}
        />
        <p className="mt-5">
          <a
            href="/submit"
            className="inline-block rounded-lg border border-accent px-4 py-2 font-semibold text-accent-dark hover:bg-[#f7ede4]"
          >
            Have spare passes? List them →
          </a>
        </p>
      </section>

      <section className="mt-12 [&_h2]:mt-9 [&_h2]:mb-2.5 [&_h2]:text-[23px] [&_h2]:font-semibold">
        <h2>What you get with a Claude Code pass</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>7 days of Claude Pro, free</strong> - the full paid plan, not a limited
            demo.
          </li>
          <li>
            <strong>Claude Code</strong> - the agentic coding tool in your terminal and IDE.
          </li>
          <li>
            <strong>Cowork</strong> - Claude working alongside you on files and everyday tasks.
          </li>
          <li>
            Higher usage limits and access to Anthropic&rsquo;s latest models while the pass
            runs.
          </li>
        </ul>

        <h2>Is there a Claude coupon code?</h2>
        <p>
          People search for a Claude coupon, a Claude promo code, a Claude Pro discount - and
          the honest answer is that <strong>Anthropic doesn&rsquo;t issue any</strong>. What
          exists instead is the{" "}
          <a className="text-accent-dark underline" href={GUEST_PASS_DOC} rel="noopener">
            guest pass program
          </a>
          : every Pro and Max subscriber holds a few personal invites, each worth a free week of
          Claude Pro for someone new. Most of those passes expire unshared. A Claude pass from
          this board is the closest thing to a Claude coupon that actually works.
        </p>

        <h2>How claiming works</h2>
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            <strong>Sign in</strong> with Google or your email - no password to invent.
          </li>
          <li>
            <strong>Unlock a pass</strong> on the board to reveal its claude.ai invite link.
          </li>
          <li>
            <strong>Open the link and sign up</strong> on claude.ai. The 7-day Claude Pro trial
            starts there.
          </li>
          <li>
            <strong>Tell us if it worked.</strong> Your one-click answer retires exhausted links
            for everyone after you.
          </li>
        </ol>

        <h2>Before you claim - the fine print</h2>
        <p>
          Passes only apply to people <strong>new to paid Claude</strong>. Anthropic asks for a
          payment card at signup, and unless you cancel within the 7 days the account becomes a
          regular paid Claude Pro subscription. Passes are limited per subscriber and
          first-come, first-served, so a listed link can be exhausted before anyone reports it.
          All program rules are Anthropic&rsquo;s - see the{" "}
          <a className="text-accent-dark underline" href={GUEST_PASS_DOC} rel="noopener">
            official guest pass page
          </a>
          .
        </p>

        <h2 id="faq">Frequently asked questions</h2>
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
