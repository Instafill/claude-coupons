"use client";

import { track } from "@vercel/analytics";
import { useState } from "react";

import type { ClaimedCode } from "@/lib/coupons";
import type { PublicDrop } from "@/lib/product-state";

// The live drop, for someone who is confirmed on the list: one button, one code. A repeat
// press shows the same code, because the server hands out one per person per drop.
export default function DropPanel({
  slug,
  token,
  drop,
  claim,
  onClaimed,
}: {
  slug: string;
  token: string | null;
  drop: PublicDrop;
  claim: ClaimedCode | null;
  onClaimed: (claim: ClaimedCode) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onClaim() {
    setBusy(true);
    setReason(null);
    const response = await fetch(`/api/coupons/${slug}/claim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ t: token }),
    });
    const data = await response.json().catch(() => ({}));
    if (data.ok) {
      track("coupon_claimed", { product: slug, repeat: Boolean(data.repeat) });
      onClaimed(data.claim);
    } else {
      setReason(data.reason || "error");
    }
    setBusy(false);
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // The code is on screen; selecting it by hand still works.
    }
  }

  if (claim) {
    return (
      <div className="mt-4 rounded-xl border border-[#b9dcc9] bg-[#eaf6ef] px-4 py-4">
        <p className="text-sm font-semibold text-good">Yours for this drop: {claim.label}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="rounded-lg bg-surface px-3 py-2 font-mono text-[17px] font-semibold tracking-wide">
            {claim.code}
          </code>
          <button
            type="button"
            onClick={() => copy(claim.code)}
            className="cursor-pointer rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:border-accent"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          {claim.redeemUrl && (
            <a
              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white no-underline hover:bg-accent-dark"
              href={claim.redeemUrl}
              rel="noopener"
              target="_blank"
            >
              Redeem &rarr;
            </a>
          )}
        </div>
        <p className="mt-2 text-[13px] text-muted">
          {claim.terms ? `${claim.terms} ` : ""}
          {claim.expiresAt ? `Expires ${new Date(claim.expiresAt).toLocaleDateString()}. ` : ""}
          One code per person; this one is recorded as yours.
        </p>
      </div>
    );
  }

  if (reason === "sold_out" || drop.remaining <= 0) {
    return (
      <div className="mt-4 rounded-xl border border-line bg-paper px-4 py-4">
        <p className="font-semibold">All codes are gone.</p>
        <p className="mt-1 text-sm text-muted">You stay on the list for the next drop.</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onClaim}
        disabled={busy}
        className="cursor-pointer rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
      >
        {busy ? "Claiming..." : "Claim my code"}
      </button>
      {reason === "not_subscribed" && (
        <p className="mt-2 text-sm text-bad">We couldn&rsquo;t match you to the list. Open the link from the drop email.</p>
      )}
      {reason === "not_live" && <p className="mt-2 text-sm text-bad">This drop isn&rsquo;t live any more.</p>}
      {reason === "error" && <p className="mt-2 text-sm text-bad">Something went wrong. Try again.</p>}
    </div>
  );
}
