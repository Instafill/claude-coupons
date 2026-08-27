"use client";

import { useActionState } from "react";

import { submitPass, type SubmitState } from "@/app/actions";

export default function SubmitForm() {
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(submitPass, {});

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-2.5">
      <label htmlFor="link" className="text-sm font-semibold">
        Your invite link
      </label>
      <input
        id="link"
        name="link"
        type="text"
        required
        placeholder="https://claude.ai/referral/AbCd123456"
        className="rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-[15px] outline-accent"
      />
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
      >
        {pending ? "Listing…" : "List my passes"}
      </button>
    </form>
  );
}
