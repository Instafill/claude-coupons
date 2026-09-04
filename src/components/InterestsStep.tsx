"use client";

import { useState } from "react";

import { MAX_OTHER_LENGTH, TOOLS } from "@/lib/interests";

/**
 * The question asked on the way to the inbox. It rides under "check your inbox" rather than
 * inside the form above it, so the thing that decides whether someone joins stays short and
 * this costs the queue nothing.
 *
 * The consent box is unticked and stands apart from the answer: naming a tool is research,
 * only the box is permission to write, and the copy says which promise it leaves alone.
 */
export default function InterestsStep({ answerToken }: { answerToken: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "dismissed">("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    const body = new FormData(event.currentTarget);
    body.set("answerToken", answerToken);
    await fetch("/api/watch/interests", { method: "POST", body }).catch(() => null);
    setState("done");
  }

  if (state === "dismissed") return null;

  if (state === "done") {
    return (
      <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
        <span className="font-semibold text-ink">Noted &mdash; thank you.</span> It decides which
        pages we build next. Your place in the queue is unchanged.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 border-t border-line pt-4">
      <p className="text-sm font-semibold">While you&rsquo;re here &mdash; what else would you want a deal for?</p>
      <p className="mt-0.5 text-[13px] text-muted">
        Optional. Nothing here has agreed to anything &mdash; we&rsquo;re asking before we ask them.
      </p>

      <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {TOOLS.map((tool) => (
          <label key={tool} className="flex cursor-pointer items-center gap-2 text-[14px]">
            <input type="checkbox" name="tools" value={tool} className="accent-[var(--accent)]" />
            <span>{tool}</span>
          </label>
        ))}
      </div>

      <input
        name="other"
        type="text"
        maxLength={MAX_OTHER_LENGTH}
        placeholder="Something we missed"
        className="mt-2.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[14px] outline-accent"
      />

      <label className="mt-2.5 flex cursor-pointer items-start gap-2 text-[14px]">
        <input type="checkbox" name="optIn" value="1" className="mt-1 accent-[var(--accent)]" />
        <span>
          Email me if one of these gets a drop.
          <span className="block text-[13px] text-muted">
            A separate list. Pass alerts don&rsquo;t change.
          </span>
        </span>
      </label>

      <div className="mt-3 flex items-center gap-4">
        <button
          type="submit"
          disabled={state === "sending"}
          className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-[14px] font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {state === "sending" ? "Saving..." : "Send"}
        </button>
        <button
          type="button"
          onClick={() => setState("dismissed")}
          className="cursor-pointer text-[14px] text-muted underline underline-offset-2"
        >
          No thanks
        </button>
      </div>
    </form>
  );
}
