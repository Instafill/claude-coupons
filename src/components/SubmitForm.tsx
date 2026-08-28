"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import { useActionState } from "react";

import { submitPass, type SubmitState } from "@/app/actions";

export default function SubmitForm() {
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(submitPass, {});

  if (state.success) {
    return (
      <div className="mt-5 rounded-xl border border-[#b9dcc9] bg-[#eaf6ef] px-4 py-4 text-good">
        <p className="font-semibold">{state.success}</p>
        <Link className="mt-2 inline-block underline" href="/">
          See it on the board &rarr;
        </Link>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={() => track("pass_submit_attempted")}
      className="mt-4 flex flex-col gap-2.5"
    >
      <label htmlFor="link" className="text-sm font-semibold">
        Your invite link
      </label>
      <input
        id="link"
        name="link"
        type="url"
        inputMode="url"
        required
        placeholder="https://claude.ai/referral/c_AbCd1234"
        className="rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-[15px] outline-accent"
      />
      <div className="hp" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
      >
        {pending ? "Listing..." : "List my passes"}
      </button>
    </form>
  );
}
