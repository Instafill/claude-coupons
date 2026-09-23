import type { Metadata } from "next";

import SubmitForm from "@/components/SubmitForm";
import { getUser } from "@/lib/auth";
import { DEFAULT_DEAL, getDeal, isDealSlug } from "@/lib/deals";

export const metadata: Metadata = {
  title: "Share a Referral Code - Claude Coupons",
  description:
    "List a spare referral code so someone actually uses it: Claude Code passes, Waymo and Uber promo codes, muse.ai invites, Pokémon GO referrals, Fireflies.ai links. No account required.",
  alternates: { canonical: "https://claudecoupons.com/submit" },
};

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ deal?: string }>;
}) {
  const user = await getUser();
  // The board someone arrived from, so a Waymo rider who pressed "share yours" is not made
  // to pick Waymo again on the page that took them there.
  const { deal } = await searchParams;
  const requested = deal && isDealSlug(deal) ? deal : DEFAULT_DEAL;
  // A board that takes no listings is not in the picker below, so arriving on it would label
  // the form with a brand it cannot submit to.
  const initialDeal = getDeal(requested).waitlistOnly ? DEFAULT_DEAL : requested;

  return (
    <section className="mx-auto mt-8 max-w-md">
      <h1 className="text-[28px] font-bold">Share a referral code</h1>
      <p className="mt-1 font-semibold text-good">No account or sign-in required.</p>
      <p className="mt-2">
        A code sitting unused in an app is worth nothing to anybody. Listed here it goes to a
        queue of people waiting for exactly that one - and on most of these programs you are
        paid when they use it. Subscribed to Claude Pro or Max? Your guest passes are each a
        free week of Claude Pro for someone new; find one with{" "}
        <code className="rounded bg-[#f0ede6] px-1.5 py-0.5 text-sm">/passes</code> in Claude
        Code or in the Claude app settings.
      </p>

      <SubmitForm initialDeal={initialDeal} />

      <p className="mt-5 text-sm text-muted">
        Only the code is stored - where a program has a personal link, we rebuild it ourselves,
        so an arbitrary link cannot reach the board. Automated checks reject malformed or
        abusive submissions, and anonymous submissions are rate-limited. Your listing is masked
        until a signed-in visitor unlocks it, and comes down once its uses run out.
      </p>

      {user ? (
        <p className="mt-3 text-sm text-muted">
          Because you&rsquo;re signed in, you can track unlocks and claims on{" "}
          <a className="text-accent-dark underline" href="/manage">
            your dashboard
          </a>
          .
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Want to track unlocks and claims?{" "}
          <a className="text-accent-dark underline" href="/signin?return_to=%2Fsubmit">
            Sign in first
          </a>{" "}
          - it&rsquo;s optional.
        </p>
      )}
    </section>
  );
}
