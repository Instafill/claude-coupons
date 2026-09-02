"use client";

import { useActionState, useState } from "react";

import { createUnofficialProductAction, type AdminState } from "@/app/admin/actions";
import { MIN_DESCRIPTION_WORDS } from "@/lib/product-state";

const INPUT = "rounded-lg border border-line bg-surface px-3 py-2 outline-accent";

export default function UnofficialProductForm() {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(createUnofficialProductAction, {});
  // Controlled, so a rejected submission keeps what was typed (React resets the form
  // after an action). Cleared by hand on success.
  const empty = { name: "", slug: "", tagline: "", websiteUrl: "", logoUrl: "", description: "", threshold: "100" };
  const [values, setValues] = useState(empty);
  const [lastSuccess, setLastSuccess] = useState<string | undefined>(undefined);
  if (state.success && state.success !== lastSuccess) {
    setLastSuccess(state.success);
    setValues(empty);
  }
  const bind = (key: keyof typeof values) => ({
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value })),
  });
  return (
    <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Name
        <input name="name" required {...bind("name")} className={INPUT} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Slug <span className="font-normal text-muted">(optional)</span>
        <input name="slug" {...bind("slug")} className={INPUT} placeholder="instafill-ai" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold sm:col-span-2">
        One line
        <input name="tagline" required minLength={10} maxLength={140} {...bind("tagline")} className={INPUT} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Website
        <input name="websiteUrl" type="url" required {...bind("websiteUrl")} className={INPUT} placeholder="https://" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Logo URL <span className="font-normal text-muted">(optional)</span>
        <input name="logoUrl" type="url" {...bind("logoUrl")} className={INPUT} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold sm:col-span-2">
        Description <span className="font-normal text-muted">(at least {MIN_DESCRIPTION_WORDS} words, blank line between paragraphs)</span>
        <textarea name="description" required rows={6} {...bind("description")} className={INPUT} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Goal
        <input name="threshold" type="number" min={5} {...bind("threshold")} className={INPUT} />
      </label>
      <div className="sm:col-span-2">
        {state.error && <p className="text-sm text-bad">{state.error}</p>}
        {state.success && <p className="text-sm font-semibold text-good">{state.success}</p>}
        <button type="submit" disabled={pending} className="mt-2 cursor-pointer rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-dark disabled:opacity-60">
          {pending ? "Creating..." : "Create unofficial page"}
        </button>
      </div>
    </form>
  );
}
