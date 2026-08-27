// The supply side of the first screen. Sits opposite the board so a subscriber with spare
// passes sees their own offer without scrolling, exactly as a claimer does.
export default function ShareCard() {
  return (
    <aside className="flex flex-col rounded-2xl bg-ink px-6 py-7 text-paper">
      <p className="text-[13px] font-semibold tracking-wider text-accent uppercase">
        Have passes to give
      </p>

      <h2 className="mt-2 text-[25px] leading-tight font-bold">
        Your spare Claude passes are worth <span className="text-accent">$10 each</span>
      </h2>

      <p className="mt-3 text-[15px] text-white/70">
        Every Claude Pro and Max subscriber holds a few guest passes, and almost nobody spends
        them. Hand one over and Anthropic credits you $10 in usage when that person stays
        subscribed. Sitting on them pays nothing - they expire either way.
      </p>

      {/* mt-auto keeps the call to action on the bottom edge, level with the caveat in the
          board panel opposite. The wrapper carries the spacing so the button keeps its own. */}
      <div className="mt-auto pt-5">
        <a
          href="/submit"
          className="inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-dark"
        >
          Share your passes →
        </a>
        <p className="mt-3 text-[13px] text-white/50">
          Takes about twenty seconds. You can retire a listing anytime.
        </p>
      </div>
    </aside>
  );
}
