// The detailed half of the submitter pitch. ShareCard above makes the offer; this explains
// the mechanics for someone who scrolled because they were interested.
export default function ShareCta() {
  const steps = [
    {
      n: "1",
      title: "Find your invite link",
      body: (
        <>
          Run <code className="rounded bg-[#f0ede6] px-1.5 py-0.5 font-mono text-[13px]">/passes</code>{" "}
          in Claude Code, or open Settings in the Claude desktop app. Your link looks like{" "}
          <span className="font-mono text-[13px]">claude.ai/referral/…</span>
        </>
      ),
    },
    {
      n: "2",
      title: "List it on the board",
      body: (
        <>
          Paste the link and it goes live. We store the code only and show it masked until a
          signed-in visitor unlocks it, so bots can&rsquo;t scrape your allotment in one pass.
        </>
      ),
    },
    {
      n: "3",
      title: "Watch it, and get paid",
      body: (
        <>
          Your dashboard shows how many people unlocked and claimed each link. Anthropic credits
          you $10 in usage for every referral that stays subscribed.
        </>
      ),
    },
  ];

  return (
    <section className="mt-14 rounded-2xl border border-line bg-surface px-6 py-9 sm:px-10">
      <h2 className="text-[26px] leading-tight font-bold">
        How sharing your Claude Code passes works
      </h2>
      <p className="mt-2 max-w-2xl text-muted">
        The board only works if subscribers keep it stocked, so this side is built to cost you
        nothing but a paste.
      </p>

      <ol className="mt-7 grid gap-7 sm:grid-cols-3">
        {steps.map((step) => (
          <li key={step.n}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[15px] font-bold text-white">
              {step.n}
            </span>
            <h3 className="mt-3 font-semibold">{step.title}</h3>
            <p className="mt-1 text-[15px] text-muted">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <a
          href="/submit"
          className="rounded-lg bg-accent px-6 py-3 text-[17px] font-semibold text-white hover:bg-accent-dark"
        >
          List my Claude passes →
        </a>
        <span className="text-[15px] text-muted">
          Nothing to maintain - the board takes a listing down by itself.
        </span>
      </div>
    </section>
  );
}
