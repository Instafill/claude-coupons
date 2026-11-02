import Link from "next/link";

import { CaptchaBridge, CaptchaSlot } from "@/components/CaptchaBridge";
import LocalTime from "@/components/LocalTime";
import PlaceMe from "@/components/PlaceMe";
import WatchForm from "@/components/WatchForm";
import type { Deal } from "@/lib/deals";
import type { DrawSummary } from "@/lib/draw";
import type { Standing } from "@/lib/queue";

// The first screen of a board given out by live draw: your place in the line, what it gets
// you, and the form. PassListCard's counterpart for the boards that go in turns, with a
// different promise: an invite to every draw, the same chance as everyone, not a turn.

// Below this, the day's pace is an argument against joining rather than for it.
const SHOW_PACE_FROM = 5;

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
          people there{next.everyone ? ", and everyone in the room has the same chance" : ""}.
        </>
      );
  } else if (standing) {
    heading = (
      <>
        You&rsquo;re in for the next <span className="text-accent">live draw</span>.
      </>
    );
    body =
      "When Claude links come in, everyone in line gets the invite by email, and everyone in the room has the same chance, however long they've waited.";
  } else {
    heading = (
      <>
        Take a number for the <span className="text-accent">live draw</span>.
      </>
    );
    body =
      "Leave your email once and you're invited to every live draw until you win. It doesn't matter when you joined: everyone in the room has the same chance.";
  }

  const rules: React.ReactNode[] = [
    `Each ${deal.name} link listed here is good for ${deal.unlocksPerListing} people, so it is ${deal.unlocksPerListing} spots in a live draw.`,
    "When links come in, everyone in line is invited by email to a live draw that starts a few minutes later.",
    "Everyone in the room when it starts has the same chance. Winners are drawn live, and a spot not claimed within a minute is re-drawn among the people still there.",
    "Win a spot and you leave the line. Miss a draw and nothing changes: you're invited to the next one.",
  ];

  return (
    <section className="rounded-2xl border border-line bg-surface px-6 py-6">
      {confirmed && standing && (
        <p className="mb-4 rounded-lg bg-[#eaf6ef] px-3 py-2 text-sm font-semibold text-good">
          You&rsquo;re in. Number {standing.position}: the next draw&rsquo;s invite comes to you.
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
                    {served} {served === 1 ? "person" : "people"} got a pass this week.{" "}
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
                Number {standing.position} &middot; on the list
              </p>
              <p className="mt-1 text-sm">
                Every live draw&rsquo;s invite comes to you, with the same chance as everyone, until you win.
              </p>
              {/* Renders nothing. Someone holding a number is the person we could not place
                  from anything stored, and this is the one moment we see them. */}
              <PlaceMe />
            </div>
          ) : (
            <>
              <WatchForm deal={deal} signedIn={signedIn} email={email} buttonLabel="Take my number" />
              <p className="mt-2 text-[13px] text-muted">
                One click in the confirmation email puts you on the list. After that the only emails are live draw
                invites, and one click stops them.
              </p>
            </>
          )}
        </div>
      </CaptchaBridge>
    </section>
  );
}
