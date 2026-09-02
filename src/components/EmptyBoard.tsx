import Link from "next/link";

// What stands in for the board when every pass has been claimed. It explains why the board
// is empty and points at the supply side; the one place to subscribe is the list card
// above it, so there is no second form here asking the same thing twice.
export default function EmptyBoard() {
  return (
    <div className="rounded-xl border border-line bg-paper px-5 py-5">
      <h3 className="text-[19px] font-semibold">No passes on the board right now</h3>
      <p className="mt-2 text-[15px] text-muted">
        Passes go fast &mdash; most are unlocked within minutes of being listed. New ones
        arrive whenever a Claude Pro or Max subscriber shares a spare, which some days means
        several and some days means none. The list above is how you hear the moment one lands.
      </p>
      <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
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
