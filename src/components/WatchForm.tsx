"use client";

import { track } from "@vercel/analytics";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCaptchaToken } from "@/components/CaptchaBridge";
import Turnstile from "@/components/Turnstile";
import type { Deal } from "@/lib/deals";
import { TURNSTILE_FIELD } from "@/lib/turnstile";

// The stem carries the product so the options stay short and parallel. Values never change
// with the wording - they are what the answers from before this edit are counted as.
const INTENTS = [
  { value: "subscribe", label: "Subscribe if it works out" },
  { value: "free", label: "Just use the free week" },
  { value: "unsure", label: "Not sure yet" },
];

// The email capture on the empty board. Follows SignInForm: a plain fetch, state in place,
// the form replaced by its own answer. The three end states say different things on purpose
// - "check your inbox" and "you're on the list" are not the same promise.
//
// One screen and one submit. The form's only job is to get someone a number, so anything
// riding along with it has to be nearly free to skip.
//
// A free-text "want a deal on anything else?" box rode here for four days and was removed:
// 3 answers in 60 joins, and two of those were questions about Claude Pro rather than the
// name of another product. It was asking people to do the hard half of the thinking.
export default function WatchForm({
  deal,
  signedIn,
  email,
  buttonLabel,
}: {
  /** Which board this form joins. One submit, one queue - somebody wanting two of them
      fills in two forms, on the two pages that promise two different things. */
  deal: Deal;
  signedIn: boolean;
  email?: string;
  buttonLabel?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "watching">("idle");
  const [error, setError] = useState<string | null>(null);
  // Inside the queue card the widget lives in the other column, so the proof is carried
  // here instead of injected. Everywhere else this is empty and the widget renders below.
  const { bridged, token } = useCaptchaToken();
  const router = useRouter();

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
      track("watch_requested", { signedIn, deal: deal.slug });
      setState(data.watching ? "watching" : "sent");
      // A pre-verified address is on the list now, so the board's unlock button is live.
      if (data.watching) router.refresh();
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
          Next {deal.noun}, you get the email. One click in it stops them for good.
        </p>
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div className="mt-5 rounded-xl border border-line bg-surface p-5">
        <h3 className="font-semibold">Check your inbox.</h3>
        <p className="mt-1 text-sm text-muted">
          One email is waiting. Click the link in it or you are not on the list, and nothing else
          is sent.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2.5 sm:max-w-sm">
      {/* Honeypot: humans never see it, bots fill it. */}
      <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden />
      <input type="hidden" name="deal" value={deal.slug} />
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

      {/* Asked to find out who is here for a week and who is here for a subscription. It is
          stated plainly that the answer changes nothing, because an answer that buys a
          better place is an answer everybody gives.
          
          Only where the brand has something worth asking: there is no equivalent question
          about a $10 ride, and a question asked for symmetry is a question that costs
          conversions for nothing. */}
      {deal.intentQuestion && (
      <fieldset className="mt-1">
        <legend className="text-sm font-semibold">{deal.intentQuestion}</legend>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {INTENTS.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-start gap-2 text-[14px]">
              <input
                type="radio"
                name="intent"
                value={option.value}
                required
                className="mt-1 accent-[var(--accent)]"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[13px] text-muted">Does not affect your place in line.</p>
      </fieldset>
      )}

      {bridged ? (
        token && <input type="hidden" name={TURNSTILE_FIELD} value={token} />
      ) : (
        <Turnstile />
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
      <button
        type="submit"
        disabled={state === "sending"}
        className="cursor-pointer rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
      >
        {state === "sending" ? "Saving..." : buttonLabel ?? `Watch for ${deal.nounPlural}`}
      </button>
      {signedIn && email && (
        <p className="text-[13px] text-muted">We&rsquo;ll write to {email}.</p>
      )}
    </form>
  );
}
