import Link from "next/link";

import WatchForm from "@/components/WatchForm";

// What stands in for the board when every pass has been claimed. The old empty state was one
// grey sentence and a dead end; this one explains why the board is empty, what happens next,
// and offers the only thing we can actually do about it.
export default function EmptyBoard({
  signedIn,
  email,
}: {
  signedIn: boolean;
  email?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-paper px-5 py-5">
      <h3 className="text-[19px] font-semibold">No passes on the board right now</h3>
      <p className="mt-2 text-[15px] text-muted">
        Passes go fast &mdash; most are unlocked within minutes of being listed. New ones
        arrive whenever a Claude Pro or Max subscriber shares a spare, which some days means
        several and some days means none.
      </p>
      <p className="mt-3 text-[15px]">
        Leave your email and we&rsquo;ll tell you the moment the board has passes again.
        That&rsquo;s the only thing we&rsquo;ll ever send you: no newsletter, we don&rsquo;t
        share your address, and one click in any email stops it for good.
      </p>

      <WatchForm signedIn={signedIn} email={email} />

      <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
        Subscribed to Claude Pro or Max?{" "}
        <Link className="text-accent-dark underline" href="/submit">
          List your spare passes
        </Link>{" "}
        and the board fills up for the next person. New here?{" "}
        <Link className="text-accent-dark underline" href="/claude-guest-pass">
          How Claude guest passes work
        </Link>
        .
      </p>
    </div>
  );
}
