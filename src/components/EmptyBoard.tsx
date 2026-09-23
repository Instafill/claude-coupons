import Link from "next/link";

import { DEFAULT_DEAL, type Deal } from "@/lib/deals";

// What stands in for the board when everything on it has been claimed. It explains why the
// board is empty and points at the supply side; the one place to subscribe is the list card
// above it, so there is no second form here asking the same thing twice.
export default function EmptyBoard({ deal }: { deal: Deal }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-5 py-5">
      <h3 className="text-[19px] font-semibold">
        {deal.awaitingFirstListing
          ? `No ${deal.name} ${deal.nounPlural} on the board yet`
          : `No ${deal.name} ${deal.nounPlural} on the board right now`}
      </h3>
      <p className="mt-2 text-[15px] text-muted">{deal.emptyNote}</p>
      {/* No ask where there is nothing to ask for: on a waitlist board the brand issues
          nothing anyone could be holding, and inviting a paste would undo the page. */}
      {!deal.waitlistOnly && (
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
      )}
    </div>
  );
}
