"use client";

import { useActionState } from "react";

import { releaseNowAction, type ActionState } from "@/app/founders/actions";
import ActionMessage from "@/components/founders/ActionMessage";
import type { PublicDrop } from "@/lib/product-state";

// The one button that sends mail. It says exactly what will happen before it is pressed,
// and afterwards how far the send got, because the fan-out has a ceiling per press.
export default function ReleasePanel({
  slug,
  drop,
  poolCapacity,
  waiting,
  goalReached,
  canRelease,
  notifyRemaining,
}: {
  slug: string;
  drop: PublicDrop | null;
  poolCapacity: number;
  waiting: number;
  goalReached: boolean;
  canRelease: boolean;
  notifyRemaining: number;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(releaseNowAction, {});
  const live = drop && (drop.status === "releasing" || drop.status === "released");
  const continuing = drop?.status === "releasing" && notifyRemaining > 0;

  let headline: string;
  let detail: string;
  if (live && drop) {
    headline = `Drop #${drop.number} is live: ${drop.remaining} of ${drop.capacity} codes left.`;
    detail = continuing
      ? `${notifyRemaining} people on the list still haven't been emailed. Press Release again to continue - nobody is emailed twice.`
      : `Everyone on the list has been emailed. New subscribers can still join and claim while codes remain.`;
  } else if (drop?.status === "exhausted") {
    headline = `Drop #${drop.number} sold out.`;
    detail = `Load codes for the next one. ${waiting} people have joined since; the bar restarted at the release.`;
  } else if (poolCapacity === 0) {
    headline = goalReached ? `${waiting} people are waiting and there is nothing to release.` : `${waiting} waiting. No codes loaded yet.`;
    detail = "Load codes above, then release whenever you like - before the goal is fine.";
  } else {
    headline = `${poolCapacity} codes ready for ${waiting} people.`;
    detail = goalReached
      ? "The goal is reached. Releasing emails everyone on the list at the same moment; codes go first come, first served."
      : "You can release before the goal. Everyone on the list is emailed at the same moment; codes go first come, first served.";
  }

  const label = continuing ? "Continue sending" : live ? "Everyone emailed" : "Release now";
  const disabled = pending || !canRelease || (live && !continuing) || (!live && poolCapacity === 0 && drop?.status !== "releasing");

  return (
    <div className="mt-3 rounded-xl border border-line bg-paper px-4 py-4">
      <p className="font-semibold">{headline}</p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
      <form action={formAction} className="mt-3">
        <input type="hidden" name="slug" value={slug} />
        <button
          type="submit"
          disabled={Boolean(disabled)}
          className="cursor-pointer rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-dark disabled:cursor-default disabled:opacity-50"
        >
          {pending ? "Sending..." : label}
        </button>
        {!canRelease && <p className="mt-2 text-[13px] text-muted">Confirm you can issue the codes before releasing.</p>}
        <ActionMessage state={state} />
      </form>
    </div>
  );
}
