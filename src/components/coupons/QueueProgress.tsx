import { describeDuration } from "@/lib/product-state";
import type { PageState, Progress, PublicDrop } from "@/lib/product-state";

// The queue against its goal, in words first and a bar second. Small numbers are not
// emphasised - a bar at 2 of 100 tells a visitor to leave - so the first two bands lead
// with the goal and only the third shows the count. Every number comes from the caller,
// which read it from the database; nothing here is a constant.
export default function QueueProgress({
  name,
  owned,
  progress,
  drop,
  state,
  hasCodes,
}: {
  name: string;
  owned: boolean;
  progress: Progress;
  drop: PublicDrop | null;
  state: PageState;
  hasCodes: boolean;
}) {
  const { n, threshold, left, band } = progress;
  const percent = Math.min(100, Math.round((n / threshold) * 100));

  let heading: string;
  let body: string;
  let showNumber = true;

  if (state === "live" && drop) {
    heading = `Drop #${drop.number} is live: ${drop.remaining} of ${drop.capacity} codes left.`;
    body = "First come, first served. Each person on the list can claim one code.";
  } else if (state === "sold_out" && drop) {
    const took =
      drop.releasedAt && drop.exhaustedAt
        ? describeDuration(new Date(drop.exhaustedAt).getTime() - new Date(drop.releasedAt).getTime())
        : null;
    heading = `Drop #${drop.number} is gone.`;
    body = `All ${drop.capacity} codes were claimed${took ? ` in ${took}` : ""}. The next drop unlocks at ${threshold} more subscribers - ${n} so far.`;
  } else if (band === "goal") {
    if (!owned) {
      heading = `Goal reached, but ${name}'s team hasn't joined yet.`;
      body = `${n} people are waiting. There are no codes until someone from ${name} claims this page. Know someone there? Send them this page.`;
    } else if (!hasCodes) {
      heading = `Goal reached: ${n} people are waiting.`;
      body = `${name} hasn't loaded codes yet. We've told them, and everyone on the list is emailed the moment they release. Joining now puts you in that first drop.`;
    } else {
      heading = `Goal reached: ${n} people are waiting.`;
      body = `${name} has codes loaded and can release the drop any moment. Everyone on the list is emailed at the same second.`;
    }
  } else if (band === "empty") {
    heading = "Be the first on the list.";
    body = `When ${threshold} people are waiting, ${name} releases a batch of codes to everyone at once. Fewer codes than people, so being early matters.`;
    showNumber = false;
  } else if (band === "few") {
    heading = "Be among the first.";
    body = `${threshold} requests unlock the drop, and the earliest names hear first.`;
    showNumber = false;
  } else {
    heading = `${n} of ${threshold} waiting.`;
    body = `${left} more and the codes drop. One email, nothing else.`;
  }

  return (
    <div>
      <h2 className="text-[21px] leading-tight font-semibold">{heading}</h2>
      <p className="mt-1.5 text-[15px] text-muted">{body}</p>
      {state !== "live" && (
        <div
          className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#ece8df]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={threshold}
          aria-valuenow={Math.min(n, threshold)}
          aria-label={`${n} of ${threshold} subscribers`}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${showNumber ? Math.max(percent, 2) : Math.max(percent, 1)}%` }}
          />
        </div>
      )}
      {state === "live" && drop && (
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#ece8df]" aria-hidden="true">
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${Math.max(2, Math.round((drop.remaining / Math.max(1, drop.capacity)) * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}
