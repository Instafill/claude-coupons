import type { Metadata } from "next";
import Link from "next/link";

import Article, { type Fact, FactTable } from "@/components/Article";
import { FREE_TRIAL_FAQS } from "@/lib/faqs";
import { GUEST_PASS_DOC, articleMetadata } from "@/lib/seo";

// Third intent, third page. The home page takes "claude coupon", /claude-guest-pass takes
// the programme's own vocabulary, and this one takes "claude free trial" - a question about
// Anthropic's pricing rather than about passes. The three only stay apart because each
// answers a question the other two do not ask, which is also why the FAQ sets are separate.
const DESCRIPTION =
  "Anthropic runs no free trial of Claude Pro. Here is what the free plan actually includes, why Claude Code is not in it, and the one supported way to get 7 days of Pro free.";

const PATH = "/claude-free-trial";

export const metadata: Metadata = articleMetadata({
  title: "Claude Free Trial: How to Get 7 Days of Pro | Claude Coupons",
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "claude free trial",
    "claude pro free trial",
    "claude 7 day free trial",
    "claude pro 7 day trial",
    "how to get claude pro for free",
    "free claude subscription",
    "is claude code free",
    "claude free plan",
  ],
  imageAlt: "Claude free trial",
});

const FACTS: Fact[] = [
  {
    term: "Official Pro free trial",
    def: "None. Anthropic's pricing page has no trial option and no trial button.",
  },
  {
    term: "Free plan",
    def: "Yes, permanently, at $0 - chat, web search, memory, file creation, connectors, extended thinking.",
  },
  {
    term: "Claude Code on the free plan",
    def: "Not included. Pro is the cheapest plan that has it, and Cowork.",
  },
  {
    term: "The one free week of Pro",
    def: "A guest pass from an existing Pro or Max subscriber.",
  },
  {
    term: "Cost after the week",
    def: "$20/month, or $17/month billed annually. Max starts at $100/month.",
  },
  {
    term: "Card required",
    def: "Yes, to redeem a pass. Nothing is charged if you cancel inside the seven days.",
  },
];

export default function FreeTrialPage() {
  return (
    <Article
      h1="Claude free trial: what exists, and how to get seven days of Pro"
      description={DESCRIPTION}
      path={PATH}
      faqs={FREE_TRIAL_FAQS}
      faqHeading="Claude free trial questions"
      cta={{
        heading: "Start your seven days",
        body: "Subscribers list spare guest passes here rather than let them expire. Unlock one, redeem it on claude.ai, and tell us whether it worked.",
        label: "See available Claude passes",
      }}
      lead={
        <>
          {/* The query is a yes/no question, so it gets a yes/no answer in the first line
              rather than three paragraphs of preamble. The redirect to what *does* exist
              is the reason this page is useful rather than merely correct. */}
          <p>
            <strong>Anthropic does not run a free trial of Claude Pro.</strong>{" "}
            There is no trial button at checkout, no 14-day window, and no
            card-free evaluation period - every plan on the pricing page says
            &ldquo;Try Claude&rdquo;, not &ldquo;Start free trial&rdquo;. Anyone
            promising you one is describing something else.
          </p>
          <p>
            Two real things exist instead: a{" "}
            <strong>permanently free plan</strong> that does not include Claude
            Code, and a <strong>guest pass</strong> - seven days of the full Pro
            plan, passed on by an existing subscriber.{" "}
            <Link className="font-semibold text-accent-dark underline" href="/">
              This board lists passes people have shared
            </Link>{" "}
            so they don&rsquo;t expire unused.
          </p>
        </>
      }
    >
      <h2>The short version</h2>
      <FactTable
        rows={FACTS}
        note={
          <>
            Plan and price rows come from{" "}
            <a
              className="text-accent-dark underline"
              href="https://claude.com/pricing"
              rel="noopener"
            >
              Anthropic&rsquo;s pricing page
            </a>
            ; the pass rows from its{" "}
            <a
              className="text-accent-dark underline"
              href={GUEST_PASS_DOC}
              rel="noopener"
            >
              guest pass article
            </a>
            .
          </>
        }
      />

      <h2>Why people go looking for a Claude trial</h2>
      <p>
        Almost always for the same reason: they want{" "}
        <strong>Claude Code</strong>, hit the paywall, and assume there must be
        a trial behind it. There isn&rsquo;t. Anthropic lists Pro as the
        cheapest plan that includes Claude Code and Cowork, so the free tier -
        generous as it is for chat - stops exactly where the agentic coding tool
        begins.
      </p>
      <p>
        That gap is the whole reason the guest pass programme exists, and the
        reason a week of Pro is worth more to a developer than a month of the
        free plan would be.
      </p>

      <h2>What the free plan actually gives you</h2>
      <p>
        The free tier is a real product, not a countdown. At $0 it covers chat
        on web, desktop and mobile, web search, memory, file creation and code
        execution, connectors, and extended thinking. For research, writing and
        everyday questions it is often enough on its own.
      </p>
      <p>What it does not cover:</p>
      <ul className="mt-3 list-disc space-y-1 pl-6">
        <li>
          <strong>Claude Code</strong> - the terminal and IDE coding agent.
        </li>
        <li>
          <strong>Cowork</strong> - Claude working alongside you on files and
          tasks.
        </li>
        <li>
          Pro-level usage limits, which is what most people actually run out of
          first.
        </li>
      </ul>

      <h2>The one genuine free week of Claude Pro</h2>
      <p>
        A{" "}
        <Link className="text-accent-dark underline" href="/claude-guest-pass">
          guest pass
        </Link>{" "}
        is a personal invite that eligible Pro and Max subscribers can send.
        Opening one gives someone new to paid Claude seven days of the full Pro
        plan, Claude Code and Cowork included. It is the closest thing to a
        trial that exists, with two differences worth knowing before you start:
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-6">
        <li>
          <strong>It is not self-serve.</strong> You cannot generate one; a
          subscriber has to pass it to you, and each has only a few.
        </li>
        <li>
          <strong>It only works once, for new accounts.</strong> Anthropic
          requires that recipients be new to Claude paid subscriptions, so a
          lapsed Pro account disqualifies you.
        </li>
      </ul>

      <h2>How to get seven days of Claude Pro free</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-6">
        <li>
          <strong>Ask a subscriber.</strong> Anyone on Pro or Max can run{" "}
          <code className="rounded bg-[#f4e4da] px-1.5 py-0.5 text-[14px]">
            /passes
          </code>{" "}
          in Claude Code and send you a link in seconds. Most have never
          checked, and unshared passes expire.
        </li>
        <li>
          <strong>Or take one from this board.</strong> Join the list, unlock a
          pass when one is listed, open it on claude.ai.{" "}
          <Link className="text-accent-dark underline" href="/">
            See what is available now
          </Link>
          .
        </li>
        <li>
          <strong>Set a reminder for day six.</strong> Redeeming needs a payment
          card, and the account converts to paid Pro when the week ends unless
          you cancel. Cancel in time and you pay nothing.
        </li>
      </ol>

      <h2>What it costs if you keep it</h2>
      <p>
        Pro is <strong>$20 per month</strong> billed monthly, or{" "}
        <strong>$17 per month</strong> paid annually. Max starts at $100 per
        month for higher limits. There is no student rate, no seasonal sale and
        no discount code - a point worth making because a great deal of the web
        insists otherwise.
      </p>

      <h2>Things that are not a free trial</h2>
      <p>
        Searches for free Claude access surface a lot that is not what it
        claims. Worth recognising:
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-6">
        <li>
          <strong>&ldquo;Free Claude Pro accounts.&rdquo;</strong> Anthropic
          issues none. These are shared logins or phishing pages. A real pass
          never asks for your password - you create the account yourself.
        </li>
        <li>
          <strong>Resold or group subscriptions.</strong> Passes have no cash
          value and are non-transferable, so anyone charging for one is selling
          what they don&rsquo;t own.
        </li>
        <li>
          <strong>Coupon and promo code sites.</strong> There are no Claude
          discount codes to find, which is why those pages never quite produce
          one.
        </li>
      </ul>
    </Article>
  );
}
