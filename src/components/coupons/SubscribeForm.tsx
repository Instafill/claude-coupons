"use client";

import { track } from "@vercel/analytics";
import { useState } from "react";

// The email capture on a product page. Follows WatchForm: a plain fetch, state in place,
// the form replaced by its own answer. The end states say different things on purpose -
// "check your inbox" and "you're #12" are not the same promise.
export default function SubscribeForm({
  slug,
  productName,
  consent,
  signedIn,
  email,
  buttonLabel,
  onResult,
}: {
  slug: string;
  productName: string;
  consent: string;
  signedIn: boolean;
  email?: string;
  buttonLabel: string;
  onResult: (result: { status: string; position?: number }) => void;
}) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);

    const response = await fetch(`/api/coupons/${slug}/subscribe`, {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      track("coupon_subscribe_requested", { product: slug, signedIn });
      onResult(data);
    } else {
      setError(data.error || "Could not save that. Try again.");
    }
    setSending(false);
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2.5 sm:max-w-sm">
      <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden />
      {signedIn && email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <>
          <label htmlFor="subscribe-email" className="text-sm font-semibold">
            Email address
          </label>
          <input
            id="subscribe-email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="rounded-lg border border-line bg-surface px-3 py-2.5 outline-accent"
          />
        </>
      )}
      <p className="text-[13px] text-muted">{consent}</p>
      {error && <p className="text-sm text-bad">{error}</p>}
      <button
        type="submit"
        disabled={sending}
        className="cursor-pointer rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
      >
        {sending ? "Saving..." : buttonLabel}
      </button>
      {signedIn && email && (
        <p className="text-[13px] text-muted">
          We&rsquo;ll write to {email} when {productName} drops.
        </p>
      )}
    </form>
  );
}
