import Link from "next/link";

import { CaptchaBridge, CaptchaSlot } from "@/components/CaptchaBridge";
import LocalTime from "@/components/LocalTime";
import PlaceMe from "@/components/PlaceMe";
import WatchForm from "@/components/WatchForm";
import type { Deal } from "@/lib/deals";
import type { DrawSummary } from "@/lib/draw";
import type { Standing } from "@/lib/queue";

// The first screen of a board given out by live draw: your place in the line, what it gets
// you, and the form. PassListCard's counterpart for waves, with the same honest pressure -
// nobody behind you can get in front - and a different promise: an invite, not a turn.

// Below this, the day's pace is an argument against joining rather than for it.
const SHOW_PACE_FROM = 5;

function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n.toLocaleString("en-US")}${suffix}`;
}

export default function DrawListCard({
  deal,
  summary,
  served,
  joinedToday,
  standing,
  signedIn,
  email,
  confirmed,
}: {
  deal: Deal;
  summary: DrawSummary;
  served: number;
  joinedToday: number;
  standing: Standing | null;
  signedIn: boolean;
  email?: string;
  confirmed: boolean;
}) {
  const { next, last } = summary;
  const invites = next?.invited ?? summary.invites;
  const atFront = standing !== null && standing.rank <= invites;

  let heading: React.ReactNode;
  let body: React.ReactNode;
  if (next?.youreInvited) {
    heading = (
      <>
        You&rsquo;re invited.{" "}
        <span className="text-accent">{next.status === "drawing" ? "The draw is on now." : "The next draw is yours."}</span>
      </>
    );
    body =
      next.status === "drawing" ? (
        "Go in now: any spot a winner doesn't claim is re-drawn among the people in the room."
      ) : (
        <>
          It starts at <LocalTime at={next.drawAt} weekday />. Be in the room when it does: winners are drawn from the
          people there.
        </>
      );
  } else if (standing) {
    heading = (
      <>
        You&rsquo;re <span className="text-accent">{ordinal(standing.rank)}</span> in line.
      </>
    );
    body = atFront
      ? `That's the front: the next draw invites the first ${invites}, so the invite comes to you.`
      : `${standing.ahead.toLocaleString("en-US")} ${standing.ahead === 1 ? "person is" : "people are"} ahead of you, and nobody who joins now can get in front. Each draw invites the first ${invites}.`;
  } else {
    heading = (
      <>
        Take a number for the <span className="text-accent">live draw</span>.
      </>
    );
    body = "Numbers are handed out in order and never reused. The place you take today is the best place you will ever have.";
  }

  const rules: React.ReactNode[] = [
    "Numbers are handed out in order and never reused. Join later and you start further back, always.",
    `Each ${deal.name} link listed here is good for ${deal.unlocksPerListing} people, so it is ${deal.unlocksPerListing} spots in a live draw.`,
    <>
      On a day links are listed, the first {invites} in line are invited by email to a draw at{" "}
      <LocalTime at={summary.nextScheduled} />.
    </>,
    "Winners are drawn from the people in the room. A spot not claimed within a minute is re-drawn among those still there.",
    "Win a spot and you leave the queue - everyone behind you moves up a place.",
    "Skip three invites and your number goes to the back.",
  ];

  return (
    <section className="rounded-2xl border border-line bg-surface px-6 py-6">
      {confirmed && standing && (
        <p className="mb-4 rounded-lg bg-[#eaf6ef] px-3 py-2 text-sm font-semibold text-good">
          You&rsquo;re in. Number {standing.position}, {ordinal(standing.rank)} in line.
        </p>
      )}

      <h2 className="text-[25px] leading-tight font-semibold">{heading}</h2>
      <p className="mt-1.5 text-[15px] text-muted">{body}</p>
      {next?.youreInvited && (
        <Link
          href={`/draw/${next.id}`}
          className="mt-3 inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-dark"
        >
          Open the draw room →
        </Link>
      )}

      {joinedToday >= SHOW_PACE_FROM && (
        <p className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#f0ede6] px-3 py-1 text-[13px] font-semibold text-muted">
            {joinedToday} took a number today
          </span>
        </p>
      )}

      <CaptchaBridge className="mt-5 grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <div>
          <div className="rounded-xl border border-line bg-paper px-5 py-4">
            <p className="text-[12px] font-semibold tracking-wider text-accent-dark uppercase">How the draw works</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[14px]">
              {rules.map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ol>
            {(served > 0 || last) && (
              <p className="mt-3 border-t border-line pt-3 text-[13px] text-muted">
                {served > 0 && (
                  <>
                    The queue moved {served} {served === 1 ? "place" : "places"} this week.{" "}
                  </>
                )}
                {last && (
                  <>
                    Last draw: {last.claimed} of {last.spots} {last.spots === 1 ? "spot" : "spots"} claimed,{" "}
                    {last.joined} in the room.
                  </>
                )}
              </p>
            )}
          </div>

          {!standing && (
            <div className="mt-3">
              <CaptchaSlot />
            </div>
          )}
        </div>

        <div id="join">
          {standing ? (
            <div className="rounded-xl border border-[#b9dcc9] bg-[#eaf6ef] px-4 py-4 text-good">
              <p className="font-semibold">
                Number {standing.position} &middot; {ordinal(standing.rank)} in line
              </p>
              <p className="mt-1 text-sm">
                {standing.ahead === 0
                  ? "You are first in line. The next draw invites you before anyone else."
                  : `${standing.ahead.toLocaleString("en-US")} ahead of you. Each one who wins a spot leaves the queue and you move up.`}
              </p>
              {/* Renders nothing. Someone holding a number is the person we could not place
                  from anything stored, and this is the one moment we see them. */}
              <PlaceMe />
            </div>
          ) : (
            <>
              <WatchForm deal={deal} signedIn={signedIn} email={email} buttonLabel="Take my number" />
              <p className="mt-2 text-[13px] text-muted">
                One click in the confirmation email holds your place. After that the only emails are draw invites, at
                most one a day, and one click stops them.
              </p>
            </>
          )}
        </div>
      </CaptchaBridge>
    </section>
  );
}
