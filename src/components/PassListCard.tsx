import Link from "next/link";

import WatchForm from "@/components/WatchForm";
import type { ClaimSpeed } from "@/lib/passes";

// The first screen's one ask. Passes are claimed within minutes of being listed, so the
// list is how anyone actually gets one, and this card says so before the board does its
// proving underneath. Every number here was read from the database by the page; a line
// with no data behind it is left out rather than filled in.

// Under this many, the count is a reason to leave rather than to join, so the copy leads
// with the promise instead.
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
  if (livePasses > 0) {
    heading = `${livePasses} ${livePasses === 1 ? "pass" : "passes"} on the board right now.`;
    body = `Sign in and unlock one before it goes. Then join the list, so next time you hear the moment a pass is listed${showCount ? ` - ${waiting} people already do` : ""}.`;
  } else if (showCount) {
    heading = `No passes right now. ${waiting} people are waiting for the next one.`;
    body = "Join them and you get the same email at the same moment. First to unlock wins.";
  } else {
    heading = "No passes right now. Be on the list for the next one.";
    body = "The moment a subscriber lists a pass, everyone on the list gets one email. First to unlock wins.";
  }

  const rows: [string, string][] = [
    [
      "What you get",
      "7 days of Claude Pro, Claude Code and Cowork included, for someone new to paid Claude. No code to type: a pass is a personal invite link.",
    ],
    ...(speed
      ? ([
          [
            "How fast they go",
            `Of the last ${speed.sample} passes, the typical one was unlocked within ${speed.medianMinutes} minute${speed.medianMinutes === 1 ? "" : "s"} of being listed.`,
          ],
        ] as [string, string][])
      : []),
    [
      "How it works",
      "When the board goes from empty to having a pass, everyone on the list gets one email at the same moment. Open it, sign in, unlock. First to unlock wins.",
    ],
    [
      "If you miss it",
      "You stay on the list. Never more than one email every 12 hours, never anything else, and one click in any email stops it for good.",
    ],
  ];

  return (
    <section className="rounded-2xl border border-line bg-surface px-6 py-6">
      {confirmed && (
        <p className="mb-4 rounded-lg bg-[#eaf6ef] px-3 py-2 text-sm font-semibold text-good">
          Confirmed. You&rsquo;re on the list.
        </p>
      )}

      <h2 className="text-[23px] leading-tight font-semibold">{heading}</h2>
      <p className="mt-1.5 text-[15px] text-muted">{body}</p>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-paper text-[14px]">
          {rows.map(([term, def]) => (
            <div key={term} className="grid gap-x-4 gap-y-0.5 px-4 py-2.5 sm:grid-cols-[8.5rem_1fr]">
              <dt className="font-semibold">{term}</dt>
              <dd className="text-muted">{def}</dd>
            </div>
          ))}
        </dl>

        <div>
          {watching || confirmed ? (
            <div className="rounded-xl border border-[#b9dcc9] bg-[#eaf6ef] px-4 py-4 text-good">
              <p className="font-semibold">You&rsquo;re on the list.</p>
              <p className="mt-1 text-sm">
                We&rsquo;ll email you the moment the board goes from empty to having passes. Every
                message carries a one-click link to stop.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold">
                {livePasses > 0 ? "Hear about the next one first" : "Get the email"}
              </p>
              <WatchForm
                signedIn={signedIn}
                email={email}
                buttonLabel="Tell me when a pass is listed"
              />
              {!signedIn && (
                <p className="mt-3 text-[13px] text-muted">
                  Signed-in addresses skip the confirmation email.{" "}
                  <Link className="text-accent-dark underline" href="/signin?return_to=%2F">
                    Sign in
                  </Link>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
