"use client";

import { useActionState } from "react";

import { requestOwnershipAction, type ActionState } from "@/app/founders/actions";
import ActionMessage from "@/components/founders/ActionMessage";

export default function ClaimOwnershipForm({
  slug,
  productName,
  domain,
  email,
  domainMatches,
}: {
  slug: string;
  productName: string;
  domain: string;
  email: string;
  domainMatches: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(requestOwnershipAction, {});

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      <div className="hp" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <p className="text-[15px]">
        Signed in as <strong>{email}</strong>.{" "}
        {domainMatches ? (
          <span className="text-good">That&rsquo;s on {domain}, so the page is yours as soon as you press the button.</span>
        ) : (
          <>
            That isn&rsquo;t on <strong>{domain}</strong>, so a person will check the request. Signing in with a{" "}
            {domain} address instead approves it on the spot.
          </>
        )}
      </p>
      {!domainMatches && (
        <label className="flex flex-col gap-1 text-sm font-semibold">
          How can we tell you run {productName}? <span className="font-normal text-muted">(optional)</span>
          <textarea name="note" rows={3} maxLength={500} className="rounded-lg border border-line bg-surface px-3 py-2 outline-accent" placeholder="Your role, a link to a team page, anything that helps." />
        </label>
      )}
      <ActionMessage state={state} />
      <button type="submit" disabled={pending} className="cursor-pointer self-start rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-dark disabled:opacity-60">
        {pending ? "Sending..." : domainMatches ? "Claim this page" : "Send the request"}
      </button>
    </form>
  );
}
