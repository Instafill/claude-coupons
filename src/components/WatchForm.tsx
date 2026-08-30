"use client";

import { track } from "@vercel/analytics";
import { useState } from "react";

// The email capture on the empty board. Follows SignInForm: a plain fetch, state in place,
// the form replaced by its own answer. The three end states say different things on purpose
// - "check your inbox" and "you're on the list" are not the same promise.
export default function WatchForm({
  signedIn,
  email,
}: {
  signedIn: boolean;
  email?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "watching">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError(null);

    const response = await fetch("/api/watch", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      track("watch_requested", { signedIn });
      setState(data.watching ? "watching" : "sent");
    } else {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Could not save that. Try again.");
      setState("idle");
    }
  }

  if (state === "watching") {
    return (
      <div className="mt-5 rounded-xl border border-[#b9dcc9] bg-[#eaf6ef] px-4 py-4 text-good">
        <p className="font-semibold">You&rsquo;re on the list.</p>
        <p className="mt-1 text-sm">
          We&rsquo;ll email you the next time the board goes from empty to having passes. Every
          message carries a one-click link to stop.
        </p>
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div className="mt-5 rounded-xl border border-line bg-surface p-5">
        <h3 className="font-semibold">Check your inbox</h3>
        <p className="mt-1 text-sm text-muted">
          If that address is valid, we&rsquo;ve sent one email asking you to confirm. Click the
          link in it and you&rsquo;re watching &mdash; until you do, we won&rsquo;t send you
          anything else.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2.5 sm:max-w-sm">
      {/* Honeypot: humans never see it, bots fill it. */}
      <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden />
      {signedIn ? (
        // The session address is already proven, so there is nothing to type and no
        // confirmation email to wait for.
        <input type="hidden" name="email" value={email} />
      ) : (
        <>
          <label htmlFor="watch-email" className="text-sm font-semibold">
            Email address
          </label>
          <input
            id="watch-email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="rounded-lg border border-line bg-surface px-3 py-2.5 outline-accent"
          />
        </>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
      <button
        type="submit"
        disabled={state === "sending"}
        className="cursor-pointer rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
      >
        {state === "sending"
          ? "Saving..."
          : signedIn
            ? "Email me when passes return"
            : "Watch for passes"}
      </button>
      {signedIn && email && (
        <p className="text-[13px] text-muted">We&rsquo;ll write to {email}.</p>
      )}
    </form>
  );
}
