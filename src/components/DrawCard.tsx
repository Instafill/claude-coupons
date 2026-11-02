import Link from "next/link";

import LocalTime from "@/components/LocalTime";
import type { Deal } from "@/lib/deals";
import type { DrawSummary } from "@/lib/draw";

// What stands where a board of passes used to, on a board given out by live draw: the next
// draw (and the way into it, for the people invited), what is waiting for one, and how the
// last one went. Every number on it is read from the draws themselves.
export default function DrawCard({ deal, summary }: { deal: Deal; summary: DrawSummary }) {
  const { next, waiting, last } = summary;
  const spots = (n: number) => `${n} ${n === 1 ? "spot" : "spots"}`;
  const links = (n: number) => `${n} ${n === 1 ? "link" : "links"}`;

  return (
    <div className="rounded-xl border border-line bg-paper px-5 py-5">
      {next ? (
        <>
          <p className="text-[12px] font-semibold tracking-wider text-accent-dark uppercase">
            {next.status === "drawing" ? "Live now" : "Next live draw"}
          </p>
          <h3 className="mt-1 text-[22px] leading-tight font-semibold">
            {next.status === "drawing" ? (
              "The draw is on"
            ) : (
              <>
                <LocalTime at={next.drawAt} weekday />
              </>
            )}
          </h3>
          <p className="mt-1.5 text-[15px] text-muted">
            {links(next.links)}, {spots(next.spots)}.{" "}
            {next.everyone
              ? `Everyone who was in line is invited (${next.invited.toLocaleString("en-US")}), with the same chance each.`
              : `The first ${next.invited} in line are invited.`}
          </p>
          {next.youreInvited ? (
            <Link
              href={`/draw/${next.id}`}
              className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-dark"
            >
              You&rsquo;re invited. Open the room →
            </Link>
          ) : (
            <p className="mt-3 text-[14px] text-muted">
              Not on this one&rsquo;s list? Keep your number: every draw invites everyone in line when it opens, so
              the next one is yours.
            </p>
          )}
        </>
      ) : waiting.spots > 0 ? (
        <>
          <p className="text-[12px] font-semibold tracking-wider text-accent-dark uppercase">Waiting for the draw</p>
          <h3 className="mt-1 text-[22px] leading-tight font-semibold">{spots(waiting.spots)} saved for the next draw</h3>
          <p className="mt-1.5 text-[15px] text-muted">
            {links(waiting.links)} listed. When the draw is set, everyone in line gets the invite by email, a few
            minutes before it starts.
          </p>
        </>
      ) : (
        <>
          <h3 className="text-[19px] font-semibold">No {deal.name} passes waiting right now</h3>
          <p className="mt-2 text-[15px] text-muted">
            A live draw runs whenever passes have been listed. Take a number above and the invite comes by email, a
            few minutes before it starts.
          </p>
        </>
      )}

      {last && (
        <p className="mt-4 border-t border-line pt-4 text-[14px] text-muted">
          Last draw: {last.claimed} of {spots(last.spots)} claimed, {last.joined} {last.joined === 1 ? "person" : "people"}{" "}
          in the room.
        </p>
      )}
      <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
        {deal.supplyAsk}{" "}
        <Link className="text-accent-dark underline" href={`/submit?deal=${deal.slug}`}>
          List your spare {deal.nounPlural}
        </Link>{" "}
        - each link goes to {deal.unlocksPerListing} people in a draw.{" "}
        <Link className="text-accent-dark underline" href="/claude-guest-pass">
          How passes work
        </Link>
        .
      </p>
    </div>
  );
}
