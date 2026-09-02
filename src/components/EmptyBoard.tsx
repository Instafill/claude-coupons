import Link from "next/link";

// What stands in for the board when every pass has been claimed. It explains why the board
// is empty and points at the supply side; the one place to subscribe is the list card
// above it, so there is no second form here asking the same thing twice.
export default function EmptyBoard() {
  return (
    <div className="rounded-xl border border-line bg-paper px-5 py-5">
      <h3 className="text-[19px] font-semibold">No passes on the board right now</h3>
      <p className="mt-2 text-[15px] text-muted">
        Passes are listed a few times a week and unlocked within minutes. The list above gets
        the email the moment one lands. Refreshing this page does not.
      </p>
      <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
        Have Claude Pro or Max?{" "}
        <Link className="text-accent-dark underline" href="/submit">
          List your spare passes
        </Link>{" "}
        - they expire unused otherwise.{" "}
        <Link className="text-accent-dark underline" href="/claude-guest-pass">
          How passes work
        </Link>
        .
      </p>
    </div>
  );
}
