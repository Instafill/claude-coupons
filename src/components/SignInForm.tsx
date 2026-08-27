"use client";

import { track } from "@vercel/analytics";
import { useState } from "react";

export default function SignInForm({ returnTo }: { returnTo: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError(null);

    const res = await fetch("/api/auth/magic", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    if (res.ok) {
      track("signin_started", { method: "email" });
      setState("sent");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not send the link. Try again.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="mt-5 rounded-xl border border-line bg-surface p-5">
        <h2 className="font-semibold">Check your inbox</h2>
        <p className="mt-1 text-sm text-muted">
          If that address is valid, a sign-in link is on its way. It works once and expires in
          30 minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2.5">
      <input type="hidden" name="return_to" value={returnTo} />
      {/* Honeypot: humans never see it, bots fill it. */}
      <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden />
      <label htmlFor="email" className="text-sm font-semibold">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        placeholder="you@example.com"
        className="rounded-lg border border-line bg-surface px-3 py-2.5 outline-accent"
      />
      {error && <p className="text-sm text-bad">{error}</p>}
      <button
        type="submit"
        disabled={state === "sending"}
        className="cursor-pointer rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
      >
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
