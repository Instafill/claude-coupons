"use client";

import { useActionState } from "react";

import { acceptWarrantAction, type ActionState } from "@/app/founders/actions";
import ActionMessage from "@/components/founders/ActionMessage";

// Before any code is loaded: the founder says, once, that the codes are theirs to give.
// Recorded with a timestamp; the site is a list and a mailer, never the reseller.
export default function WarrantForm({ slug, productName }: { slug: string; productName: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(acceptWarrantAction, {});
  return (
    <form action={formAction} className="mt-3 rounded-xl border border-line bg-paper px-4 py-4">
      <input type="hidden" name="slug" value={slug} />
      <label className="flex items-start gap-3 text-[15px]">
        <input name="warrant" type="checkbox" required className="mt-1.5" />
        <span>
          I&rsquo;m authorised to issue coupon codes for <strong>{productName}</strong>. Whoever redeems one is{" "}
          {productName}&rsquo;s customer, on {productName}&rsquo;s terms. Claude Coupons keeps the waiting list
          and sends the drop email; it is not a reseller or an authorised agent of {productName}.
        </span>
      </label>
      <ActionMessage state={state} />
      <button type="submit" disabled={pending} className="mt-3 cursor-pointer rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent-dark disabled:opacity-60">
        {pending ? "Saving..." : "Confirm"}
      </button>
    </form>
  );
}
