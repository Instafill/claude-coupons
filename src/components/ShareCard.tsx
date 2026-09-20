import { DEFAULT_DEAL, type Deal } from "@/lib/deals";

// The supply side of the first screen. Sits opposite the board so someone holding a spare
// code sees their own offer without scrolling, exactly as a claimer does.
export default function ShareCard({ deal }: { deal: Deal }) {
  return (
    <aside className="rounded-2xl bg-ink px-6 py-7 text-paper">
      <p className="text-[13px] font-semibold tracking-wider text-accent uppercase">
        {deal.audience}
      </p>

      <h2 className="mt-2 text-[25px] leading-tight font-bold">
        {deal.slug === DEFAULT_DEAL
          ? "Give someone a week with Claude"
          : `Give someone ${deal.reward}`}
      </h2>

      <p className="mt-3 text-[15px] text-white/70">{deal.sharePitch}</p>

      {deal.giverReward && (
        <p className="mt-3 text-[14px] text-white/60">
          There can be a practical bonus too:{" "}
          <span className="font-semibold text-accent">{deal.giverReward}</span>.
        </p>
      )}

      <div className="pt-5">
        <a
          href={`/submit?deal=${deal.slug}`}
          className="inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-dark"
        >
          Share your {deal.nounPlural} →
        </a>
        <p className="mt-3 text-[13px] text-white/50">
          Takes about twenty seconds. It costs you nothing, and it could mean a great deal to
          someone else.
        </p>
      </div>
    </aside>
  );
}
