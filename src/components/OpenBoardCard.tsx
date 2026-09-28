import WatchForm from "@/components/WatchForm";
import { aNoun, type Deal } from "@/lib/deals";

// The first screen of a board whose codes do not run out (deal.openBoard). There is nothing
// to queue for - every listing is on the board below, in full - so this card only says so.
// An empty board asks for one thing: an email, so the first listing reaches somebody.
export default function OpenBoardCard({
  deal,
  livePasses,
  signedIn,
  email,
}: {
  deal: Deal;
  livePasses: number;
  signedIn: boolean;
  email?: string;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface px-6 py-6">
      <h2 className="text-[25px] leading-tight font-semibold">
        {livePasses > 0 ? (
          <>
            No queue, no sign-up.{" "}
            <span className="text-accent">
              {livePasses} {livePasses === 1 ? deal.noun : deal.nounPlural}
            </span>{" "}
            ready to use below.
          </>
        ) : (
          <>
            No {deal.nounPlural} yet. <span className="text-accent">Be the first to hear</span>{" "}
            when one lands.
          </>
        )}
      </h2>
      <p className="mt-1.5 max-w-3xl text-[15px] text-muted">
        {livePasses > 0
          ? `${deal.name} ${deal.nounPlural} don't run out, so nobody has to wait for one: every ${deal.noun} listed here is shown in full. Pick one and go.`
          : `${deal.name} ${deal.nounPlural} don't run out, so when one is listed it is shown to everyone at once - no queue. Leave your email and you hear the moment it lands.`}
      </p>
      {livePasses === 0 && (
        <div id="join" className="mt-5 max-w-md">
          <WatchForm
            deal={deal}
            signedIn={signedIn}
            email={email}
            buttonLabel="Email me when one is listed"
          />
          <p className="mt-2 text-[13px] text-muted">
            One email when {aNoun(deal)} lands. One click stops it.
          </p>
        </div>
      )}
    </section>
  );
}
