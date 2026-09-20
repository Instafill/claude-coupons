import Link from "next/link";

import { DEFAULT_DEAL, type Deal } from "@/lib/deals";

// What stands in for the board when everything on it has been claimed. It explains why the
// board is empty and points at the supply side; the one place to subscribe is the list card
// above it, so there is no second form here asking the same thing twice.
export default function EmptyBoard({ deal }: { deal: Deal }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-5 py-5">
      <h3 className="text-[19px] font-semibold">
        No {deal.name} {deal.nounPlural} on the board right now
      </h3>
      <p className="mt-2 text-[15px] text-muted">
        {deal.nounPlural.charAt(0).toUpperCase() + deal.nounPlural.slice(1)} are listed a few
        times a week and unlocked within minutes. The list above gets the email the moment one
        lands. Refreshing this page does not.
      </p>
      <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
        {deal.supplyAsk}{" "}
        <Link className="text-accent-dark underline" href={`/submit?deal=${deal.slug}`}>
          List your spare {deal.nounPlural}
        </Link>{" "}
        - they go unused otherwise.
        {deal.slug === DEFAULT_DEAL && (
          <>
            {" "}
            <Link className="text-accent-dark underline" href="/claude-guest-pass">
              How passes work
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
