import Link from "next/link";

import LocalTime from "@/components/LocalTime";
import PlaceMe from "@/components/PlaceMe";
import WatchForm from "@/components/WatchForm";
import type { Deal } from "@/lib/deals";
import type { DrawSummary } from "@/lib/draw";

// The first screen of the Claude board, now that passes are only ever given away in live
// draws. One number that says it works (everyone who has got a pass here), the promise in
// three lines, and the one thing to do: be on the list, or, on a draw day, go to the room.
// No place in line anywhere: nobody's chances depend on it, so it would only discourage.

function Check() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-good">
      <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.14" />
      <path d="M6 10.4l2.6 2.5L14 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DrawHero({
  deal,
  summary,
  served,
  joinedToday,
  onList,
  signedIn,
  email,
  confirmed,
}: {
  deal: Deal;
  summary: DrawSummary;
  /** Everyone who has ever got a pass here. */
  served: number;
  joinedToday: number;
  /** On the list for the next draw: holding a number and not yet a winner. */
  onList: boolean;
  signedIn: boolean;
  email?: string;
  confirmed: boolean;
}) {
  const { next } = summary;
  const live = next?.status === "drawing";
  const spots = (n: number) => `${n} free ${n === 1 ? "week" : "weeks"} of ${deal.name} Pro`;

  const promises = [
    <>
      <strong>Everyone on the list is invited</strong> by email to every live draw.
    </>,
    <>
      <strong>Same chance for everyone</strong> in the room, however long they&rsquo;ve waited.
    </>,
    <>
      <strong>Free.</strong> Winners are drawn live; anyone can watch and chat.
    </>,
  ];

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="grid gap-8 px-6 py-7 sm:px-8 sm:py-9 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
        <div>
          <p className="text-[12px] font-semibold tracking-wider text-accent-dark uppercase">Live draws &middot; {deal.name} Pro</p>
          <h2 className="mt-2 text-[30px] leading-[1.15] font-bold sm:text-[36px]">
            Win a free week of {deal.name} Pro in a <span className="text-accent">live draw</span>.
          </h2>

          {served > 0 && (
            <p className="mt-5 flex items-baseline gap-3">
              <span className="text-[52px] leading-none font-bold tracking-tight text-accent tabular-nums sm:text-[60px]">
                {served.toLocaleString("en-US")}
              </span>
              <span className="text-[17px] leading-snug text-muted">
                people have got a free week
                <br className="hidden sm:inline" /> of {deal.name} Pro here
              </span>
            </p>
          )}

          <ul className="mt-6 space-y-2.5 text-[16px]">
            {promises.map((line, i) => (
              <li key={i} className="flex gap-2.5">
                <Check />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-center">
          {confirmed && onList && (
            <p className="mb-3 rounded-lg bg-[#eaf6ef] px-3 py-2 text-sm font-semibold text-good">
              You&rsquo;re on the list. Every live draw&rsquo;s invite comes to you.
            </p>
          )}

          {next && (
            <div className="mb-4 rounded-2xl border border-[#f0cdb8] bg-[#fdf3ec] px-5 py-4">
              <p className="flex items-center gap-2 text-[12px] font-semibold tracking-wider text-accent-dark uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                {live ? "Live now" : "Next live draw"}
              </p>
              <p className="mt-1 text-[22px] leading-tight font-semibold">
                {live ? "The draw is on" : <LocalTime at={next.drawAt} weekday />}
              </p>
              <p className="mt-1 text-[14px] text-muted">
                {spots(next.spots)}
                {next.opensAt && !live && (
                  <>
                    {" "}
                    &middot; room opens <LocalTime at={next.opensAt} />
                  </>
                )}
              </p>
              <Link
                href={`/draw/${next.id}`}
                className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-[15px] font-semibold text-white hover:bg-accent-dark"
              >
                {next.youreInvited ? "Open your room →" : live ? "Watch live →" : "See the room →"}
              </Link>
            </div>
          )}

          {onList ? (
            <div className="rounded-2xl border border-[#b9dcc9] bg-[#eaf6ef] px-5 py-5 text-good">
              <p className="flex items-center gap-2 text-[18px] font-semibold">
                <Check /> You&rsquo;re on the list
              </p>
              <p className="mt-1.5 text-[15px]">
                {next?.youreInvited
                  ? "You're invited to the next draw. Your room link is in your email, and above."
                  : "We'll email you the invite to every live draw until you win, a few minutes before it starts."}
              </p>
              {/* Renders nothing: the one moment we see someone we could not place before. */}
              <PlaceMe />
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-paper px-5 py-5">
              <p className="text-[19px] font-semibold">{next && !live ? "Get invited to this draw" : "Get invited to the next draw"}</p>
              <p className="mt-1 mb-3 text-[14px] text-muted">
                Your email, confirmed once. Then the only emails are live draw invites, and one click stops them.
              </p>
              <WatchForm deal={deal} signedIn={signedIn} email={email} buttonLabel="Invite me to the draws" />
            </div>
          )}

          {joinedToday >= 5 && (
            <p className="mt-3 text-center text-[13px] text-muted">{joinedToday} people joined the list today</p>
          )}
        </div>
      </div>
    </section>
  );
}
