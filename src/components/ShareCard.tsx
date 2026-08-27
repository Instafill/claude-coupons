// The supply side of the first screen. Sits opposite the board so a subscriber with spare
// passes sees their own offer without scrolling, exactly as a claimer does.
export default function ShareCard() {
  return (
    <aside className="flex flex-col rounded-2xl bg-ink px-6 py-7 text-paper">
      <p className="text-[13px] font-semibold tracking-wider text-accent uppercase">
        For Claude Pro &amp; Max subscribers
      </p>

      <h2 className="mt-2 text-[25px] leading-tight font-bold">
        Share your spare Claude passes
      </h2>

      <p className="mt-3 text-[15px] text-white/70">
        You get a few guest passes with your subscription and most people never use them. Give
        one away and a stranger gets a free week of Claude Pro - and if they stay subscribed,
        Anthropic credits you <span className="font-semibold text-accent">$10</span> in usage.
        Unused passes expire either way.
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
          Takes about twenty seconds. Your listing comes down on its own once your passes run
          out.
        </p>
      </div>
    </aside>
  );
}
