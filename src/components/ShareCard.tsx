// The supply side of the first screen. Sits opposite the board so a subscriber with spare
// passes sees their own offer without scrolling, exactly as a claimer does.
export default function ShareCard() {
  return (
    <aside className="rounded-2xl bg-ink px-6 py-7 text-paper">
      <p className="text-[13px] font-semibold tracking-wider text-accent uppercase">
        For Claude Pro &amp; Max subscribers
      </p>

      <h2 className="mt-2 text-[25px] leading-tight font-bold">
        Give someone a week with Claude
      </h2>

      <p className="mt-3 text-[15px] text-white/70">
        Not everyone can afford Claude Pro. A pass you may never use can give someone seven days
        to learn, create, solve a problem, or discover what Claude can make possible for them.
        Share yours before it expires and turn something spare into something meaningful.
      </p>

      <p className="mt-3 text-[14px] text-white/60">
        There can be a practical bonus too: if your referral stays subscribed, Anthropic credits
        you <span className="font-semibold text-accent">$10 in Claude usage</span>.
      </p>

      <div className="pt-5">
        <a
          href="/submit"
          className="inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-dark"
        >
          Share your passes →
        </a>
        <p className="mt-3 text-[13px] text-white/50">
          Takes about twenty seconds. It costs you nothing, and it could mean a great deal to
          someone else.
        </p>
      </div>
    </aside>
  );
}
