"use client";

import { useActionState, useState } from "react";

import { createProductAction, updateProductAction, type ActionState } from "@/app/founders/actions";
import ActionMessage from "@/components/founders/ActionMessage";
import { MIN_DESCRIPTION_WORDS } from "@/lib/product-state";

const INPUT = "rounded-lg border border-line bg-surface px-3 py-2.5 outline-accent";

export default function ProductForm({
  initial,
}: {
  initial?: { slug: string; name: string; tagline: string; description: string; websiteUrl: string; logoUrl: string | null; threshold: number };
}) {
  const editing = Boolean(initial);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    editing ? updateProductAction : createProductAction,
    {}
  );
  // Controlled on purpose: React resets a form once its action returns, and a founder
  // whose description was a few words short should not lose everything else they typed.
  const [values, setValues] = useState({
    name: initial?.name ?? "",
    tagline: initial?.tagline ?? "",
    websiteUrl: initial?.websiteUrl ?? "",
    logoUrl: initial?.logoUrl ?? "",
    description: initial?.description ?? "",
    threshold: String(initial?.threshold ?? 100),
  });
  const bind = (key: keyof typeof values) => ({
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value })),
  });

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      {initial && <input type="hidden" name="slug" value={initial.slug} />}
      <div className="hp" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="flex flex-col gap-1 text-sm font-semibold">
        Product name
        <input name="name" required maxLength={80} {...bind("name")} className={INPUT} placeholder="Instafill.ai" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        One line: what it does
        <input name="tagline" required minLength={10} maxLength={140} {...bind("tagline")} className={INPUT} placeholder="Fills PDF and Word forms with AI" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Website
        <input name="websiteUrl" type="url" required {...bind("websiteUrl")} className={INPUT} placeholder="https://instafill.ai" />
        <span className="text-[13px] font-normal text-muted">
          An address on this domain is what lets someone claim or manage the page without waiting on us.
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Logo URL <span className="font-normal text-muted">(optional, https, square works best)</span>
        <input name="logoUrl" type="url" {...bind("logoUrl")} className={INPUT} placeholder="https://instafill.ai/logo.png" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        About the product
        <textarea
          name="description"
          required
          rows={8}
          {...bind("description")}
          className={INPUT}
          placeholder={`At least ${MIN_DESCRIPTION_WORDS} words: who it is for, what it does, what it costs. Blank lines make paragraphs.`}
        />
        <span className="text-[13px] font-normal text-muted">
          This is the page&rsquo;s body and what search engines read. Say something true and specific; a
          page under {MIN_DESCRIPTION_WORDS} words is refused.
        </span>
      </label>
      {!editing && (
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Subscribers that unlock a drop
          <input name="threshold" type="number" min={5} max={100000} {...bind("threshold")} className={`${INPUT} sm:max-w-40`} />
          <span className="text-[13px] font-normal text-muted">
            The page shows this goal. You can release earlier, and change it later.
          </span>
        </label>
      )}

      <ActionMessage state={state} />
      <button
        type="submit"
        disabled={pending}
        className="mt-1 cursor-pointer self-start rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
      >
        {pending ? "Saving..." : editing ? "Save changes" : "Create the page"}
      </button>
    </form>
  );
}
