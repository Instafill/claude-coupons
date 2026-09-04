"use client";

import { useState } from "react";

/**
 * A button that offers to sell a place in the queue, and tells the truth the instant it is
 * pressed: the offer does not exist, nothing was charged, the place is unchanged. The press
 * is the measurement.
 *
 * Deliberately never renders a payment form or asks for a card. A probe that takes money for
 * a place in this queue would be selling something Anthropic does not permit anyone to sell,
 * and the site says so on its own guest pass page.
 */
export default function SkipProbe() {
  const [state, setState] = useState<"idle" | "sending" | "answered">("idle");

  async function press() {
    setState("sending");
    await fetch("/api/queue/skip", { method: "POST" }).catch(() => null);
    // The answer is the same either way: there is nothing to buy. A failed request must not
    // leave someone believing a charge might still land.
    setState("answered");
  }

  if (state === "answered") {
    return (
      <p className="mt-3 border-t border-[#b9dcc9] pt-3 text-[13px]">
        <span className="font-semibold">Not for sale yet.</span> Nothing was charged and your
        place has not moved. We are counting who asks, to find out whether it is worth
        building at all.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={press}
      disabled={state === "sending"}
      className="mt-3 cursor-pointer border-t border-[#b9dcc9] pt-3 text-left text-[13px] font-semibold underline underline-offset-2 disabled:opacity-60"
    >
      Skip the line &mdash; $0.99
    </button>
  );
}
