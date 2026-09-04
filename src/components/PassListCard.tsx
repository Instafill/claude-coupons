import SkipProbe from "@/components/SkipProbe";
import WatchForm from "@/components/WatchForm";
import type { ClaimSpeed } from "@/lib/passes";
import type { Standing } from "@/lib/queue";
import { spotsLeftInJoinWave } from "@/lib/queue";

// The first screen: your place in the queue, what it costs to wait, and the form. The
// numbers do the persuading, so all of them are read from the database - the wave you
// would land in, how much of that wave is left, how many people took a number today.
// A queue is honest FOMO: nobody behind you can get in front, and every hour you wait,
// someone else takes the number you could have had.

// Below this, the day's pace is an argument against joining rather than for it - the same
// reason the queue length stays hidden while it is short. A quiet day simply says nothing.
const SHOW_PACE_FROM = 5;

// The wave, said loudly in the site's own orange. It is the one figure that decides your
// odds, so it is the one the eye should land on first.
function Wave({ n }: { n: number }) {
  return <span className="text-accent">wave {n}</span>;
}

export default function PassListCard({
  livePasses,
  inLine,
  joinWave,
  served,
  joinedToday,
  standing,
  openWave,
  speed,
  signedIn,
  email,
  confirmed,
}: {
  livePasses: number;
  inLine: number;
  joinWave: number;
  served: number;
  joinedToday: number;
  standing: Standing | null;
  openWave: number;
  speed: ClaimSpeed | null;
  signedIn: boolean;
  email?: string;
  confirmed: boolean;
}) {
  const spotsLeft = spotsLeftInJoinWave(inLine);
  const myTurn = standing !== null && openWave > 0 && standing.wave <= openWave;

  let heading: React.ReactNode;
  let body: string;
  if (standing && livePasses > 0 && myTurn) {
    heading = (
      <>
        Your turn. <span className="text-accent">Unlock it now</span> or lose it.
      </>
    );
    body = `Wave ${openWave} is open and you are in wave ${standing.wave}. Three unlocks and this pass is gone.`;
  } else if (standing && livePasses > 0) {
    heading = (
      <>
        You are <Wave n={standing.wave} />. Wave {openWave} is unlocking right now.
      </>
    );
    body = "A wave opens every five minutes while the pass lasts. Stay on this page - the button turns on by itself.";
  } else if (standing) {
    heading = (
      <>
        You are <Wave n={standing.wave} /> in the queue.
      </>
    );
    body = `${standing.ahead} ${standing.ahead === 1 ? "person is" : "people are"} ahead of you, and nobody who joins now can get in front. The next pass goes to wave 1 first.`;
  } else if (livePasses > 0) {
    heading = (
      <>
        A pass is live. Join now and you are <Wave n={joinWave} />.
      </>
    );
    body = "Waves open five minutes apart, so a queue this short can still reach you today. Wait, and it will not.";
  } else {
    heading = (
      <>
        Take a number. Right now you are <Wave n={joinWave} />.
      </>
    );
    body = "Numbers are handed out in order and never reused. The place you take today is the best place you will ever have.";
  }

  // Two facts, both true, both arguments for doing it now rather than later.
  const pressure: string[] = [
    !standing
      ? `Only ${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left in wave ${joinWave}`
      : "",
    joinedToday >= SHOW_PACE_FROM ? `${joinedToday} took a number today` : "",
  ].filter(Boolean);

  const rules: string[] = [
    "Numbers are handed out in order and never reused. Join later and you start further back, always.",
    "A new pass goes to the first 10 in the queue. Ten more every five minutes after that.",
    "Three unlocks and the pass is finished, so it rarely gets past the first waves.",
    "Unlock one and you leave the queue - everyone behind you moves up a place.",
    "Let three turns go by without unlocking and your number goes to the back.",
  ];

  return (
    <section className="rounded-2xl border border-line bg-surface px-6 py-6">
      {confirmed && standing && (
        <p className="mb-4 rounded-lg bg-[#eaf6ef] px-3 py-2 text-sm font-semibold text-good">
          You&rsquo;re in. Number {standing.position}, wave {standing.wave}.
        </p>
      )}

      <h2 className="text-[25px] leading-tight font-semibold">{heading}</h2>
      <p className="mt-1.5 text-[15px] text-muted">{body}</p>

      {pressure.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-2">
          {pressure.map((line, i) => (
            <span
              key={line}
              className={`rounded-full px-3 py-1 text-[13px] font-semibold ${
                i === 0 ? "bg-[#f4e4da] text-accent-dark" : "bg-[#f0ede6] text-muted"
              }`}
            >
              {line}
            </span>
          ))}
        </p>
      )}

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-xl border border-line bg-paper px-5 py-4">
          <p className="text-[12px] font-semibold tracking-wider text-accent-dark uppercase">
            How the queue works
          </p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[14px]">
            {rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
          {(served > 0 || speed) && (
            <p className="mt-3 border-t border-line pt-3 text-[13px] text-muted">
              {served > 0 && (
                <>
                  The queue moved {served} {served === 1 ? "place" : "places"} this week.{" "}
                </>
              )}
              {speed && (
                <>
                  The last {speed.sample} passes were unlocked within {speed.medianMinutes} minute
                  {speed.medianMinutes === 1 ? "" : "s"} of being listed.
                </>
              )}
            </p>
          )}
        </div>

        <div id="join">
          {standing ? (
            <div className="rounded-xl border border-[#b9dcc9] bg-[#eaf6ef] px-4 py-4 text-good">
              <p className="font-semibold">
                Number {standing.position} &middot; wave {standing.wave}
              </p>
              <p className="mt-1 text-sm">
                {standing.ahead === 0
                  ? "You are first in line. The next pass is offered to you before anyone else."
                  : `${standing.ahead} ahead of you. Each one who unlocks a pass leaves the queue and you move up.`}
              </p>
              {standing.ahead > 0 && <SkipProbe />}
            </div>
          ) : (
            <>
              <p className="text-[15px] font-semibold">
                {livePasses > 0 ? "Take your number before this one goes." : "Take your number now."}
              </p>
              <WatchForm signedIn={signedIn} email={email} buttonLabel={`Take my number - wave ${joinWave}`} />
              <p className="mt-2 text-[13px] text-muted">
                One click in the confirmation email holds your place. Nothing else is ever sent, and one
                click stops it.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
