import type { Metadata } from "next";
import Link from "next/link";

import { getUser } from "@/lib/auth";
import { DEALS } from "@/lib/deals";
import { countLivePassesByDeal } from "@/lib/passes";
import { ensureQueueAdopted, standingsFor } from "@/lib/queue";
import { SITE_URL, articleMetadata } from "@/lib/seo";

// The hub. Its job is threefold: rank for the generic phrase ("referral codes that work"),
// carry internal links to every board from one place, and be the honest index for someone
// who arrived for one code and would take another.
//
// It shows live counts rather than a static list, because a directory that says a board has
// codes when it does not is the thing every coupon aggregator does and the reason nobody
// trusts them.

const DESCRIPTION =
  "Referral codes that actually work, shared by the people who own them: Claude, Waymo, Uber, muse.ai, Pokémon GO and Fireflies.ai. Take a number and unlock one when your wave opens.";

export const dynamic = "force-dynamic";

export const metadata: Metadata = articleMetadata({
  title: "Referral Codes That Work | Claude Coupons",
  description: DESCRIPTION,
  path: "/referral-codes",
  keywords: [
    "referral codes",
    "referral codes that work",
    "working promo codes",
    "invite codes",
    "referral code exchange",
    "share referral codes",
    "waymo uber referral codes",
  ],
  imageAlt: "Referral codes that work",
});

export default async function ReferralCodesPage() {
  const user = await getUser();
  await ensureQueueAdopted();
  const [counts, standings] = await Promise.all([
    countLivePassesByDeal(),
    user ? standingsFor(user.email) : Promise.resolve(new Map()),
  ]);

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Referral codes on Claude Coupons",
    itemListElement: DEALS.map((deal, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${deal.name} ${deal.nounPlural}`,
      url: `${SITE_URL}${deal.path}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="mt-8">
        <h1 className="text-[34px] leading-tight font-bold">Referral codes that work</h1>
        <p className="mt-3 max-w-2xl text-[19px] text-muted">
          Every code here was listed by the person who owns it, offered to a queue ten people
          at a time, and retired the moment its uses ran out. Nothing is scraped, nothing is
          sold, and everyone who unlocks one is asked whether it worked.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {DEALS.map((deal) => {
            const live = counts[deal.slug] ?? 0;
            const standing = standings.get(deal.slug);
            return (
              <Link
                key={deal.slug}
                href={deal.path}
                className="flex flex-col rounded-2xl border border-line bg-surface px-5 py-5 no-underline hover:border-accent"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-[21px] font-semibold">{deal.name}</h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                      live > 0 ? "bg-[#e2f2e9] text-good" : "bg-[#f0ede6] text-muted"
                    }`}
                  >
                    {live > 0
                      ? `${live} live`
                      : `waiting on ${deal.nounPlural}`}
                  </span>
                </div>
                <p className="mt-1.5 text-[15px] font-semibold text-accent-dark">
                  {deal.reward}
                </p>
                <p className="mt-1.5 text-[15px] text-muted">{deal.summary}</p>
                <p className="mt-3 text-[13px] text-muted">
                  {standing
                    ? `You are number ${standing.position}, wave ${standing.wave}.`
                    : "Take a number →"}
                </p>
              </Link>
            );
          })}
        </div>

        <section className="mt-12 max-w-3xl [&_h2]:mt-9 [&_h2]:mb-2.5 [&_h2]:text-[23px] [&_h2]:font-semibold [&_p]:mt-3">
          <h2>Why most referral codes you find online do nothing</h2>
          <p>
            A referral code belongs to a person. It carries a limited number of uses, it often
            resets monthly, and it is nearly always written for someone&rsquo;s first order,
            ride or account. By the time a code reaches a coupon aggregator it has usually been
            spent, and the app refuses it without telling you why.
          </p>
          <p>
            This board is built the other way round. Codes are listed by the people who own
            them, handed out in order to a queue rather than to whoever refreshes fastest, and
            taken down as soon as they run out or somebody reports that they stopped working.
            That last part is the whole trick: the person who just tried a code is the only
            check on it that exists, and one click from them is what keeps the board honest.
          </p>

          <h2>How the queue works</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-6">
            <li>Leave your email on the board you want and confirm it once. That click is also your sign-in.</li>
            <li>You get a number. Numbers are handed out in order and never reused.</li>
            <li>When something is listed, the first ten in that line get it, then ten more every five minutes.</li>
            <li>Unlock it and you leave that queue, so everyone behind you moves up.</li>
            <li>Each board has its own line. Unlocking a Waymo code costs you nothing on the Claude one.</li>
          </ol>

          <h2>Have a code of your own?</h2>
          <p>
            Most referral codes expire unused. If you hold one,{" "}
            <Link className="text-accent-dark underline" href="/submit">
              list it here
            </Link>{" "}
            - it takes about twenty seconds, it costs nothing, and on most of these programs
            you are paid when someone uses it.
          </p>
        </section>
      </section>
    </>
  );
}
