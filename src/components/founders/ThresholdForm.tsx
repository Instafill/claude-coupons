"use client";

import { useActionState } from "react";

import { setThresholdAction, type ActionState } from "@/app/founders/actions";
import ActionMessage from "@/components/founders/ActionMessage";

export default function ThresholdForm({ slug, threshold }: { slug: string; threshold: number }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(setThresholdAction, {});
  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="slug" value={slug} />
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Subscribers that unlock the next drop
        <input name="threshold" type="number" min={5} max={100000} defaultValue={threshold} className="rounded-lg border border-line bg-surface px-3 py-2 outline-accent sm:max-w-40" />
      </label>
      <button type="submit" disabled={pending} className="cursor-pointer rounded-lg border border-line bg-surface px-4 py-2 font-semibold hover:border-accent disabled:opacity-60">
        {pending ? "Saving..." : "Set goal"}
      </button>
      <div className="basis-full">
        <ActionMessage state={state} />
      </div>
    </form>
  );
}
