import WatchForm from "@/components/WatchForm";
import type { ClaimSpeed } from "@/lib/passes";

// The first screen's one ask, and the rules of the board, stated once and short. Passes
// are gone within minutes of being listed, so the list is how anyone gets one; this card
// says so and asks for the email before the board does its proving underneath. Every
// number here was read from the database by the page; a line with no data is left out.

// Under this many, the count is a reason to leave rather than to join.
const SHOW_COUNT_FROM = 10;

export default function PassListCard({
  livePasses,
  waiting,
  speed,
  signedIn,
  email,
  watching,
  confirmed,
}: {
  livePasses: number;
  waiting: number;
  speed: ClaimSpeed | null;
  signedIn: boolean;
  email?: string;
  watching: boolean;
  confirmed: boolean;
}) {
  const showCount = waiting >= SHOW_COUNT_FROM;

  let heading: string;
  let body: string;
  if (livePasses > 0 && watching) {
    heading = `${livePasses} ${livePasses === 1 ? "pass is" : "passes are"} live. Unlock now or lose it.`;
    body = "You're on the list. The unlock button is below; use it before someone else does.";
  } else if (livePasses > 0) {
    heading = `${livePasses} ${livePasses === 1 ? "pass is" : "passes are"} live. Join the list to unlock.`;
    body = `Email, one click in the confirmation, and the unlock button is yours. It takes a minute; the pass may not wait that long${showCount ? `. ${waiting} people are already in` : ""}.`;
  } else if (showCount) {
    heading = `No passes. ${waiting} people are waiting for the next one.`;
    body = "Join them. The email goes to everyone at the same moment; refreshing this page gets you nothing.";
  } else {
    heading = "No passes. The list gets the next one first.";
    body = "Join it. When a pass is listed, the email goes out the same minute; refreshing this page gets you nothing.";
  }

  const rules: string[] = [
    "The list is the only door. Not on it, no unlock.",
    "Join with an email and confirm it once. Confirming signs you in; there is no other sign-in step.",
    "When a pass lands on an empty board, everyone on the list gets one email at the same moment.",
    "First to open the email and unlock gets the pass. Three claims and a pass is finished.",
    "Miss it and you stay on the list. Next email at the next pass, never more than one per 12 hours. Nothing else is ever sent; one click stops it.",
  ];

  return (
    <section className="rounded-2xl border border-line bg-surface px-6 py-6">
      {confirmed && (
        <p className="mb-4 rounded-lg bg-[#eaf6ef] px-3 py-2 text-sm font-semibold text-good">
          Confirmed. You&rsquo;re on the list.
        </p>
      )}

      <h2 className="text-[24px] leading-tight font-semibold">{heading}</h2>
      <p className="mt-1.5 text-[15px] text-muted">{body}</p>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-xl border border-line bg-paper px-5 py-4">
          <p className="text-[12px] font-semibold tracking-wider text-accent-dark uppercase">The rules</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[14px]">
            {rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
          {speed && (
            <p className="mt-3 border-t border-line pt-3 text-[13px] text-muted">
              The last {speed.sample} passes were unlocked within {speed.medianMinutes} minute
              {speed.medianMinutes === 1 ? "" : "s"} of being listed (median). That is your window.
            </p>
          )}
        </div>

        <div>
          {watching || confirmed ? (
            <div className="rounded-xl border border-[#b9dcc9] bg-[#eaf6ef] px-4 py-4 text-good">
              <p className="font-semibold">You&rsquo;re on the list.</p>
              <p className="mt-1 text-sm">
                Next pass, you get the email. The button in it opens the board with the unlock
                already yours to press.
              </p>
            </div>
          ) : (
            <div id="join">
              <p className="text-[15px] font-semibold">
                {livePasses > 0 ? "Get in and unlock it." : "Get in."}
              </p>
              <WatchForm signedIn={signedIn} email={email} buttonLabel="Put me on the list" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
