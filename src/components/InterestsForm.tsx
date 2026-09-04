"use client";

import { useState } from "react";

import { MAX_OTHER_LENGTH, TOOLS } from "@/lib/interests";

/**
 * Shown once, straight after someone confirms their place. They are already on the list, so
 * this costs the queue nothing and asks nothing of a stranger - which is also why the answers
 * are worth more than the same question on the join form would be.
 *
 * The consent box is unticked and stands apart from the answer. Naming a tool is research;
 * only the box is permission to write, and the copy says which promise it does not touch.
 */
export default function InterestsForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "dismissed">("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    await fetch("/api/watch/interests", {
      method: "POST",
      body: new FormData(event.currentTarget),
    }).catch(() => null);
    setState("done");
  }

  if (state === "dismissed") return null;

  if (state === "done") {
    return (
      <section className="mb-5 rounded-2xl border border-line bg-surface px-6 py-5">
        <p className="font-semibold">Noted &mdash; thank you.</p>
        <p className="mt-1 text-[15px] text-muted">
          It decides which pages we build next. Your place in the pass queue is unchanged.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-5 rounded-2xl border border-line bg-surface px-6 py-5">
      <h2 className="text-[19px] leading-tight font-semibold">
        While you wait &mdash; what else would you want a drop for?
      </h2>
      <p className="mt-1 text-[15px] text-muted">
        We&rsquo;re working out which tools to line up drops for next. Nothing here has agreed
        to anything yet; we&rsquo;re asking before we ask them.
      </p>

      <form onSubmit={onSubmit} className="mt-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
          {TOOLS.map((tool) => (
            <label key={tool} className="flex cursor-pointer items-center gap-2 text-[14px]">
              <input type="checkbox" name="tools" value={tool} className="accent-[var(--accent)]" />
              <span>{tool}</span>
            </label>
          ))}
        </div>

        <label htmlFor="interests-other" className="mt-4 block text-sm font-semibold">
          Anything else?
        </label>
        <input
          id="interests-other"
          name="other"
          type="text"
          maxLength={MAX_OTHER_LENGTH}
          placeholder="Another tool we missed"
          className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 outline-accent sm:max-w-sm"
        />

        <label className="mt-4 flex cursor-pointer items-start gap-2 text-[14px]">
          <input type="checkbox" name="optIn" value="1" className="mt-1 accent-[var(--accent)]" />
          <span>
            Email me if one of these gets a drop.
            <span className="block text-[13px] text-muted">
              A separate list. Your pass alerts do not change, and leaving this unticked still
              records your answer.
            </span>
          </span>
        </label>

        <div className="mt-4 flex items-center gap-4">
          <button
            type="submit"
            disabled={state === "sending"}
            className="cursor-pointer rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
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
    </section>
  );
}
