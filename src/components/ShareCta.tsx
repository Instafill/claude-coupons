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
      title: "Give someone the opportunity",
      body: (
        <>
          Someone gets a full week to experience Claude Pro because you chose not to let a pass
          go unused. Your dashboard shows how many people you reached, and Anthropic may add $10
          in usage if a referral stays subscribed.
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
        Every pass comes from a subscriber choosing to help someone else. Listing yours takes
        only a few seconds, costs nothing, and gives another person a real chance to use Claude.
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
          A small act for you. A week of possibility for someone else.
        </span>
      </div>
    </section>
  );
}
