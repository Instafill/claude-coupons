import { DEFAULT_DEAL, type Deal } from "@/lib/deals";

// The detailed half of the submitter pitch. ShareCard above makes the offer; this explains
// the mechanics for someone who scrolled because they were interested.
export default function ShareCta({ deal }: { deal: Deal }) {
  const steps = [
    {
      n: "1",
      title: `Find your ${deal.noun}`,
      body: deal.findYourCode,
    },
    {
      n: "2",
      title: "List it on the board",
      body: `Paste it and it goes live. We store the code only and show it masked until a signed-in visitor unlocks it, so bots can't scrape your ${deal.nounPlural} in one pass.`,
    },
    {
      n: "3",
      title: "Give someone the opportunity",
      body: `Someone gets ${deal.reward} because you chose not to let a ${deal.noun} go unused.${
        deal.giverReward ? ` Your dashboard shows how many people you reached, and you get ${deal.giverReward}.` : ""
      }`,
    },
  ];

  return (
    <section className="mt-14 rounded-2xl border border-line bg-surface px-6 py-9 sm:px-10">
      <h2 className="text-[26px] leading-tight font-bold">
        How sharing your {deal.name} {deal.nounPlural} works
      </h2>
      <p className="mt-2 max-w-2xl text-muted">
        {deal.slug === DEFAULT_DEAL
          ? "Every pass comes from a subscriber choosing to help someone else. Listing yours takes only a few seconds, costs nothing, and gives another person a real chance to use Claude."
          : `Every ${deal.noun} on this board comes from someone choosing to pass it on rather than let it sit in an app. Listing yours takes a few seconds and costs nothing.`}
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
          href={`/submit?deal=${deal.slug}`}
          className="rounded-lg bg-accent px-6 py-3 text-[17px] font-semibold text-white hover:bg-accent-dark"
        >
          List my {deal.name} {deal.nounPlural} →
        </a>
        <span className="text-[15px] text-muted">
          A small act for you. A real one for someone else.
        </span>
      </div>
    </section>
  );
}
