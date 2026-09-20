"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";

import { submitPass, type SubmitState } from "@/app/actions";
import Turnstile from "@/components/Turnstile";
import { DEALS, type Deal, type DealSlug, getDeal, pasteHint } from "@/lib/deals";

// One form, any board. The board is picked here rather than by having six submit pages,
// because the thing that differs between them is two sentences and a placeholder - and a
// person holding a spare Uber code and a spare Waymo code should not have to find a second
// page to list the second one.
export default function SubmitForm({ initialDeal }: { initialDeal: DealSlug }) {
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(submitPass, {});
  const [slug, setSlug] = useState<DealSlug>(initialDeal);
  const deal: Deal = getDeal(slug);

  if (state.success) {
    return (
      <div className="mt-5 rounded-xl border border-[#b9dcc9] bg-[#eaf6ef] px-4 py-4 text-good">
        <p className="font-semibold">{state.success}</p>
        <Link className="mt-2 inline-block underline" href={deal.path}>
          See it on the board &rarr;
        </Link>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={() => track("pass_submit_attempted", { deal: slug })}
      className="mt-4 flex flex-col gap-2.5"
    >
      <fieldset>
        <legend className="text-sm font-semibold">What are you sharing?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEALS.map((option) => (
            <label
              key={option.slug}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[14px] font-semibold ${
                option.slug === slug
                  ? "border-accent bg-[#f4e4da] text-accent-dark"
                  : "border-line bg-surface text-muted hover:border-accent"
              }`}
            >
              <input
                type="radio"
                name="deal"
                value={option.slug}
                checked={option.slug === slug}
                onChange={() => setSlug(option.slug)}
                className="hp"
              />
              {option.name}
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor="link" className="mt-2 text-sm font-semibold">
        {deal.acceptsBareCode ? `Your ${deal.name} code or share link` : "Your invite link"}
      </label>
      <input
        id="link"
        name="link"
        // A bare code is not a URL, and type="url" would have the browser refuse it before
        // the server ever sees it.
        type={deal.acceptsBareCode ? "text" : "url"}
        inputMode={deal.acceptsBareCode ? "text" : "url"}
        required
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder={
          deal.linkTemplate
            ? deal.linkTemplate.replace("{code}", deal.codeExample)
            : deal.codeExample
        }
        className="rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-[15px] outline-accent"
      />
      <p className="text-[13px] text-muted">
        {pasteHint(deal)} {deal.findYourCode}
      </p>
      <div className="hp" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <Turnstile />
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
      >
        {pending ? "Listing..." : `List my ${deal.nounPlural}`}
      </button>
    </form>
  );
}
