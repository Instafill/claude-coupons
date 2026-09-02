import type { Metadata } from "next";

import SubmitForm from "@/components/SubmitForm";
import { getUser } from "@/lib/auth";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Share Your Claude Code Passes - Claude Coupons",
  description:
    "List your spare Claude Code guest passes so someone actually uses them. Paste your claude.ai invite link - no account required.",
  alternates: { canonical: `${SITE_URL}/submit` },
};

export default async function SubmitPage() {
  const user = await getUser();

  return (
    <section className="mx-auto mt-8 max-w-md">
      <h1 className="text-[28px] font-bold">Share your Claude Code passes</h1>
      <p className="mt-1 font-semibold text-good">No account or sign-in required.</p>
      <p className="mt-2">
        Subscribed to Claude Pro or Max? You hold a few guest passes, each worth a free week of
        Claude Pro to someone new. Sharing one gives someone who may not be able to afford it the
        chance to learn, build, and experience Claude for themselves. If they stay subscribed,
        Anthropic may also credit you $10 in usage. Find your invite link with{" "}
        <code className="rounded bg-[#f0ede6] px-1.5 py-0.5 text-sm">/passes</code> in Claude
        Code or in the Claude app settings, and paste it below.
      </p>

      <SubmitForm />

      <p className="mt-5 text-sm text-muted">
        Only complete{" "}
        <code className="rounded bg-[#f0ede6] px-1.5 py-0.5">
          https://claude.ai/referral/...
        </code>{" "}
        links are accepted. Automated checks reject malformed or abusive submissions, and
        anonymous submissions are rate-limited. Your listing is masked until a signed-in visitor
        unlocks it and comes down once its passes run out.
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
