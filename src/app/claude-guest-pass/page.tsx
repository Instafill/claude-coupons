import type { Metadata } from "next";
import Link from "next/link";

import Article, { type Fact, FactTable } from "@/components/Article";
import { GUEST_PASS_FAQS } from "@/lib/faqs";
import { GUEST_PASS_DOC, articleMetadata } from "@/lib/seo";

// The informational half of the site. The home page owns the transactional coupon queries
// ("claude coupon", "claude promo code") and this page owns "claude guest pass" - the
// searcher who wants to know what the thing is before deciding to want one. Keeping the
// two apart is why this page's title, h1 and FAQ set avoid the word coupon almost entirely.
const DESCRIPTION =
  "A Claude guest pass is 7 free days of Claude Pro, Claude Code included. What Anthropic's own documentation says, who can send one, and how to get one today.";

const PATH = "/claude-guest-pass";

export const metadata: Metadata = articleMetadata({
  title: "Claude Guest Pass: How to Get One | Claude Coupons",
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "claude guest pass",
    "claude guest passes",
    "claude code guest pass",
    "anthropic guest pass",
    "claude cowork guest pass",
    "claude referral link",
    "how to get a claude guest pass",
    "claude guest pass not working",
  ],
  imageAlt: "Claude guest passes",
});

// The answer box. Every row is checkable against Anthropic's article, which is the point -
// most competing pages state at least one of these wrong.
const FACTS: Fact[] = [
  {
    term: "What it is",
    def: "A personal referral link from a Claude subscriber, not a code you type.",
  },
  {
    term: "What it gives",
    def: "Seven days of Claude's Pro plan, including Claude Code and Cowork.",
  },
  {
    term: "Who can send one",
    def: "Eligible Claude Pro and Max subscribers - not Max only.",
  },
  {
    term: "Who can redeem one",
    def: "Only people new to Claude paid subscriptions.",
  },
  {
    term: "Payment card",
    def: "Required at signup. Not charged if you cancel inside the seven days.",
  },
  {
    term: "After seven days",
    def: "Converts to a paid Claude Pro plan automatically unless canceled.",
  },
  {
    term: "Where a subscriber finds theirs",
    def: "/passes in Claude Code, Claude settings under Claude Code, or the Cowork tab in Claude Desktop.",
  },
];

export default function GuestPassPage() {
  return (
    <Article
      h1="Claude guest pass: what it is and how to get one"
      description={DESCRIPTION}
      path={PATH}
      faqs={GUEST_PASS_FAQS}
      faqHeading="Claude guest pass questions"
      lead={
        <>
          {/* Answers the query inside the first forty words, then says the one thing no
              other page ranking for this term can say: you do not have to know a
              subscriber. */}
          <p>
            A <strong>Claude guest pass</strong> is a personal invite from a
            Claude subscriber that gives someone new to paid Claude{" "}
            <strong>seven free days of the Pro plan</strong>, with Claude Code
            and Cowork included. It is not a coupon and there is no code to type
            - a pass is a link, and opening it starts the trial on claude.ai.
            Anthropic offers no other{" "}
            <Link
              className="text-accent-dark underline"
              href="/claude-free-trial"
            >
              free trial of Claude Pro
            </Link>
            , which makes a guest pass the only official way to use the paid
            plan without paying for the first week.
          </p>
          <p>
            The usual advice is to find a friend on Max and ask nicely. You
            don&rsquo;t have to.{" "}
            <Link className="font-semibold text-accent-dark underline" href="/">
              This board lists passes subscribers have shared
            </Link>{" "}
            - free, no resale, and links get retired once people report them
            spent.
          </p>
        </>
      }
    >
      <h2>The short version</h2>
      <FactTable
        rows={FACTS}
        note={
          <>
            Every row above comes from Anthropic&rsquo;s{" "}
            <a
              className="text-accent-dark underline"
              href={GUEST_PASS_DOC}
              rel="noopener"
            >
              guest pass support article
            </a>
            . Where this page goes beyond it, it says so.
          </>
        }
      />

      <h2>Two things most guest pass articles get wrong</h2>
      <p>
        This keyword attracts a lot of thin, recycled writing, and two errors
        have spread far enough to be worth correcting directly.
      </p>
      <p>
        <strong>&ldquo;Guest passes are Max-only.&rdquo;</strong> They are not.
        Anthropic&rsquo;s article says guest passes are &ldquo;currently
        available to eligible Pro and Max subscribers only&rdquo; - Pro counts.
        If you pay for Claude Pro, check{" "}
        <code className="rounded bg-[#f4e4da] px-1.5 py-0.5 text-[14px]">
          /passes
        </code>{" "}
        before assuming you have nothing to give. The load-bearing word is{" "}
        <em>eligible</em>: being on Pro does not guarantee passes appear, which
        is probably where the Max-only claim came from.
      </p>
      <p>
        <strong>&ldquo;You get $10 for every referral.&rdquo;</strong> Widely
        repeated, nowhere in the documentation. What Anthropic actually says is
        that a guest pass &ldquo;sometimes&rdquo; results in &ldquo;a specified
        amount of overage credits&rdquo; - conditional, unquantified, and paid
        as usage credit rather than money. Those credits expire a year after
        they are issued and are voided if you drop to the Free tier. Share
        passes because an unused one expires worthless, not because you are
        counting on $10.
      </p>

      <h2>How to get a Claude guest pass</h2>
      <p>Three routes, in descending order of how well they work.</p>
      <ol className="mt-3 list-decimal space-y-2 pl-6">
        <li>
          <strong>Ask someone who subscribes.</strong> Anyone on Claude Pro or
          Max can run{" "}
          <code className="rounded bg-[#f4e4da] px-1.5 py-0.5 text-[14px]">
            /passes
          </code>{" "}
          in Claude Code and send you a link in about ten seconds. Most
          subscribers have never looked, and passes expire unused, so asking
          costs them nothing.
        </li>
        <li>
          <strong>Claim one from this board.</strong> Join the list, unlock a
          pass when one is listed, open the link on claude.ai. The list is
          what keeps bots from scraping every link the minute it is posted,
          and the report-back button is what retires spent links instead of
          leaving them to waste the next person&rsquo;s time.{" "}
          <Link className="text-accent-dark underline" href="/">
            See what&rsquo;s available now
          </Link>
          .
        </li>
        <li>
          <strong>Watch Reddit, X and Discord.</strong> Passes do get posted
          publicly in r/ClaudeAI and elsewhere. Redemption is first-come,
          first-served and nothing marks a spent link as spent, so a post more
          than an hour old is usually a dead end. Never pay anyone for a link.
        </li>
      </ol>

      <h2>What you get during the seven days</h2>
      <ul className="mt-3 list-disc space-y-1 pl-6">
        <li>
          <strong>The full Claude Pro plan</strong> - not a reduced demo tier.
        </li>
        <li>
          <strong>Claude Code</strong>, the agentic coding tool that runs in
          your terminal and IDE.
        </li>
        <li>
          <strong>Cowork</strong>, Claude working alongside you on files and
          everyday tasks.
        </li>
        <li>
          Pro-level usage limits and access to Anthropic&rsquo;s current models.
        </li>
      </ul>
      <p>
        A week is enough to find out whether Claude Code fits how you work,
        which is the honest reason to take a pass: not free stuff, but a real
        decision made on real evidence.
      </p>

      <h2>Who can redeem one</h2>
      <p>
        Only people <strong>new to Claude paid subscriptions</strong>.
        Anthropic&rsquo;s wording is that &ldquo;referral recipients must be new
        to Claude paid subscriptions&rdquo;, and that rules out anyone with a
        current Pro or Max plan and anyone who had one and canceled. A free
        claude.ai account is fine - that is not a paid subscription. If you are
        not eligible the link will open and the pass simply will not apply, so
        it is worth checking before you spend one.
      </p>

      <h2>The payment card, stated plainly</h2>
      <p>
        Redeeming a pass requires entering payment information. Anthropic does
        not charge it during the trial, and won&rsquo;t charge it at all if you
        cancel inside the seven days - but if you don&rsquo;t cancel, the trial
        &ldquo;will automatically convert to a paid Pro plan&rdquo;. That is the
        part the enthusiastic write-ups leave out, and a few of them claim
        outright that no card is needed. Set a reminder for day six.
      </p>

      <h2>Why a Claude guest pass link doesn&rsquo;t work</h2>
      <p>
        This is the most common complaint about the program, and it usually has
        a boring cause:
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-6">
        <li>
          <strong>Someone got there first.</strong> Anthropic redeems passes
          first-come, first-served. A link posted anywhere public is often spent
          within minutes, and the link keeps working - it just stops granting
          anything.
        </li>
        <li>
          <strong>You have had a paid plan before.</strong> The single most
          common disqualifier, and the error message rarely says so.
        </li>
        <li>
          <strong>The pass expired on the sender&rsquo;s side.</strong> Passes
          are available for a limited time whether or not anyone redeems them.
        </li>
        <li>
          <strong>A bug on the sender&rsquo;s account.</strong> Subscribers have
          reported links generating as invalid while passes still showed as
          remaining, and passes vanishing from accounts outright, in{" "}
          <a
            className="text-accent-dark underline"
            href="https://github.com/anthropics/claude-code/issues/34816"
            rel="noopener"
          >
            Claude Code issue #34816
          </a>{" "}
          and{" "}
          <a
            className="text-accent-dark underline"
            href="https://github.com/anthropics/claude-code/issues/30060"
            rel="noopener"
          >
            #30060
          </a>
          .
        </li>
      </ul>
      <p>
        None of these are worth diagnosing. Trying a different pass takes ten
        seconds; if one from this board fails, mark it and the next person is
        spared the same detour.
      </p>

      <h2>If you subscribe: sending your passes</h2>
      <p>
        Open{" "}
        <code className="rounded bg-[#f4e4da] px-1.5 py-0.5 text-[14px]">
          /passes
        </code>{" "}
        in Claude Code, or find them in Claude settings under &ldquo;Claude
        Code&rdquo;, or in the &ldquo;Cowork&rdquo; tab of Claude Desktop
        settings. You get a limited number, Anthropic doesn&rsquo;t publish how
        many, and once they are redeemed or expired you cannot send more.
      </p>
      <p>
        Passes &ldquo;have no cash value and are non-transferable&rdquo;, so
        nobody should be charging you for one and you shouldn&rsquo;t be
        charging anyone. Giving a link away is the program working exactly as
        designed. If yours are going to lapse otherwise,{" "}
        <Link className="text-accent-dark underline" href="/submit">
          list them here
        </Link>{" "}
        and someone who can&rsquo;t afford Claude Pro gets a week with it.
      </p>
    </Article>
  );
}
