"use client";

import { track } from "@vercel/analytics";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Turnstile from "@/components/Turnstile";
import { MAX_OTHER_LENGTH, TOOLS } from "@/lib/interests";

const INTENTS = [
  { value: "subscribe", label: "Subscribe to Pro if it works out" },
  { value: "free", label: "Just try it for the free week" },
  { value: "unsure", label: "Not sure yet" },
];

const OTHER = "__other__";

// The email capture on the empty board. Follows SignInForm: a plain fetch, state in place,
// the form replaced by its own answer. The three end states say different things on purpose
// - "check your inbox" and "you're on the list" are not the same promise.
//
// One screen and one submit. The form's only job is to get someone a number, so the two
// questions riding along with it have to be nearly free to skip: the tools are chips rather
// than a checkbox grid - the same question at a fraction of the weight - and the consent
// line appears only once something is picked, because with nothing selected there is
// nothing to consent to and it would just be a sentence in the way.
export default function WatchForm({
  signedIn,
  email,
  buttonLabel = "Watch for passes",
}: {
  signedIn: boolean;
  email?: string;
  buttonLabel?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "watching">("idle");
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const router = useRouter();

  const toggle = (tool: string) =>
    setPicked((current) =>
      current.includes(tool) ? current.filter((t) => t !== tool) : [...current, tool]
    );

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
        <p className="mt-1 text-sm">Next pass, you get the email. One click in it stops them for good.</p>
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
          better place is an answer everybody gives. */}
      <fieldset className="mt-1">
        <legend className="text-sm font-semibold">After the free week, do you expect to</legend>
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

      <fieldset className="mt-1">
        <legend className="text-sm font-semibold">
          Want a deal on anything else? <span className="font-normal text-muted">Optional</span>
        </legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {[...TOOLS, OTHER].map((tool) => {
            const on = picked.includes(tool);
            return (
              <button
                key={tool}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(tool)}
                className={`cursor-pointer rounded-full border px-2.5 py-1 text-[13px] transition-colors ${
                  on
                    ? "border-accent bg-[#f4e4da] font-semibold text-accent-dark"
                    : "border-line bg-surface text-muted hover:border-accent"
                }`}
              >
                {tool === OTHER ? "Other" : tool}
              </button>
            );
          })}
        </div>
        {/* Only real names travel - "Other" is a prompt for the box, not an answer. */}
        {picked
          .filter((tool) => tool !== OTHER)
          .map((tool) => (
            <input key={tool} type="hidden" name="tools" value={tool} />
          ))}
        {picked.includes(OTHER) && (
          <input
            name="other"
            type="text"
            maxLength={MAX_OTHER_LENGTH}
            placeholder="Which one?"
            className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[14px] outline-accent"
          />
        )}
        {/* Unticked, and only present once there is something to be told about. The
            confirmation email promises pass alerts and never a newsletter, so this box is
            the only thing that may ever change that. */}
        {picked.length > 0 && (
          <label className="mt-2 flex cursor-pointer items-start gap-2 text-[14px]">
            <input type="checkbox" name="optIn" value="1" className="mt-1 accent-[var(--accent)]" />
            <span>
              Email me if one of these gets a deal.
              <span className="block text-[13px] text-muted">
                A separate list. Pass alerts don&rsquo;t change.
              </span>
            </span>
          </label>
        )}
      </fieldset>

      <Turnstile />
      {error && <p className="text-sm text-bad">{error}</p>}
      <button
        type="submit"
        disabled={state === "sending"}
        className="cursor-pointer rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
      >
        {state === "sending" ? "Saving..." : buttonLabel}
      </button>
      {signedIn && email && (
        <p className="text-[13px] text-muted">We&rsquo;ll write to {email}.</p>
      )}
    </form>
  );
}
