import WatchForm from "@/components/WatchForm";
import type { ClaimSpeed } from "@/lib/passes";
import type { Standing } from "@/lib/queue";

// The first screen: your place in the queue, the rules that decide it, and the form. A
// queue, not a scramble - the number of people ahead of you is the reason to join now
// rather than the reason to give up, because every one of them joined before you did and
// nobody behind you can get in front. Every figure here was read from the database.

export default function PassListCard({
  livePasses,
  inLine,
  joinWave,
  served,
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
  standing: Standing | null;
  openWave: number;
  speed: ClaimSpeed | null;
  signedIn: boolean;
  email?: string;
  confirmed: boolean;
}) {
  const myTurn = standing !== null && openWave > 0 && standing.wave <= openWave;

  let heading: string;
  let body: string;
  if (standing && livePasses > 0 && myTurn) {
    heading = "Your turn. Unlock it now.";
    body = `Wave ${openWave} is open and you are in wave ${standing.wave}. The button is below.`;
  } else if (standing && livePasses > 0) {
    heading = `You are wave ${standing.wave}. Wave ${openWave} is unlocking now.`;
    body = "A new wave opens every five minutes while the pass lasts. Stay on this page.";
  } else if (standing) {
    heading = `You are wave ${standing.wave} in the queue.`;
    body = `${standing.ahead} ${standing.ahead === 1 ? "person is" : "people are"} ahead of you. The next pass goes to wave 1 first, then a wave every five minutes.`;
  } else if (livePasses > 0) {
    heading = `A pass is live. Join and you are wave ${joinWave}.`;
    body = "Waves open five minutes apart, so a queue this short can still reach you. Every person who joins before you pushes you further back.";
  } else {
    heading = `Take a number. You would be wave ${joinWave}.`;
    body = `${inLine} ${inLine === 1 ? "person is" : "people are"} in the queue. Numbers are handed out in order and never reused, so the only way your place gets better is joining now.`;
  }

  const rules: string[] = [
    "Join with an email and confirm it once. That confirmation is your number, and your sign-in.",
    "A new pass goes to the first 10 in the queue. Five minutes later the next 10, and so on.",
    "Three unlocks and the pass is finished, so the front of the queue usually takes it.",
    "Unlock one and you leave the queue - you had your turn. Everyone behind you moves up.",
    "Let three turns pass without unlocking and your number goes to the back.",
  ];

  return (
    <section className="rounded-2xl border border-line bg-surface px-6 py-6">
      {confirmed && standing && (
        <p className="mb-4 rounded-lg bg-[#eaf6ef] px-3 py-2 text-sm font-semibold text-good">
          You&rsquo;re in. Number {standing.position}, wave {standing.wave}.
        </p>
      )}

      <h2 className="text-[24px] leading-tight font-semibold">{heading}</h2>
      <p className="mt-1.5 text-[15px] text-muted">{body}</p>

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
            </div>
          ) : (
            <>
              <p className="text-[15px] font-semibold">
                {livePasses > 0 ? "Take your number now." : "Take a number."}
              </p>
              <WatchForm signedIn={signedIn} email={email} buttonLabel="Give me my number" />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
