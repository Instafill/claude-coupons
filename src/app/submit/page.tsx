import type { Metadata } from "next";
import { redirect } from "next/navigation";

import SubmitForm from "@/components/SubmitForm";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Share Your Claude Code Passes - Claude Coupons",
  description:
    "List your spare Claude Code guest passes so someone actually uses them. Paste your claude.ai invite link - the board keeps it honest and takes it down once your passes run out.",
  alternates: { canonical: "https://claudecoupons.com/submit" },
};

export default async function SubmitPage() {
  const user = await getUser();
  if (!user) redirect("/signin?return_to=%2Fsubmit");

  return (
    <section className="mx-auto mt-8 max-w-md">
      <h1 className="text-[28px] font-bold">Share your Claude Code passes</h1>
      <p className="mt-2">
        Subscribed to Claude Pro or Max? You hold a few guest passes, each worth a free week of
        Claude Pro to someone new - and if they stay subscribed, Anthropic credits{" "}
        <em>you</em> $10 in usage. Find your invite link with{" "}
        <code className="rounded bg-[#f0ede6] px-1.5 py-0.5 text-sm">/passes</code> in Claude
        Code or in the Claude app settings, and paste it below.
      </p>

      <SubmitForm />

      <p className="mt-5 text-sm text-muted">
        Only <code className="rounded bg-[#f0ede6] px-1.5 py-0.5">claude.ai/referral/…</code>{" "}
        links are accepted. Your listing shows a masked code until a signed-in visitor unlocks
        it, and comes down by itself once three people report claiming it. Track how many
        unlocked and claimed it on{" "}
        <a className="text-accent-dark underline" href="/manage">
          your dashboard
        </a>
        ; paste the link again anytime to put it back up.
      </p>
    </section>
  );
}
