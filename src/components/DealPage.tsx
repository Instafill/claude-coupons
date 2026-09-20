import Link from "next/link";

import Board from "@/components/Board";
import EmptyBoard from "@/components/EmptyBoard";
import PassListCard from "@/components/PassListCard";
import ShareCard from "@/components/ShareCard";
import ShareCta from "@/components/ShareCta";
import { getUser } from "@/lib/auth";
import type { DealArticle } from "@/lib/dealArticles";
import { DEAL_ARTICLES } from "@/lib/dealArticles";
import { OTHER_DEALS, type Deal } from "@/lib/deals";
import { claimSpeed, getBoard } from "@/lib/passes";
import {
  ensureQueueAdopted,
  joinedToday,
  queueSize,
  servedThisWeek,
  standingFor,
  waveForNewcomer,
} from "@/lib/queue";
import { SITE_URL } from "@/lib/seo";

// Every board that is not the home page, rendered from one file.
//
// The home page stays its own: it is the page that ranks, its copy has been tuned against
// real queries, and nothing here is worth breaking it for. What the two share is the
// machinery - the queue card, the board, the share cards - which take a Deal and say the
// brand's own words back.

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-3 list-decimal space-y-1.5 pl-6">
      {steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}

export default async function DealPage({ deal }: { deal: Deal }) {
  const article = DEAL_ARTICLES[deal.slug] as DealArticle;
  const user = await getUser();

  // Before any standing is read: somebody holding a number the queue has not adopted yet
  // would be shown the join form and quietly lose their place in line.
  await ensureQueueAdopted();

  // Every number on this page comes from here. Nothing on it is a constant.
  const [passes, inLine, joinWave, served, today, speed, standing] = await Promise.all([
    getBoard(deal.slug, user?.id ?? null),
    queueSize(deal.slug),
    waveForNewcomer(deal.slug),
    servedThisWeek(deal.slug),
    joinedToday(deal.slug),
    claimSpeed(deal.slug),
    user ? standingFor(user.email, deal.slug) : Promise.resolve(null),
  ]);

  const url = `${SITE_URL}${deal.path}`;
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.h1,
      description: article.description,
      mainEntityOfPage: url,
      author: { "@type": "Organization", name: "Claude Coupons" },
      publisher: { "@type": "Organization", name: "Claude Coupons" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: article.faqs.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
    // The offer itself, so a result can carry what it is worth rather than only its title.
    // Price zero is the honest figure: the codes are shared, never sold.
    {
      "@context": "https://schema.org",
      "@type": "Offer",
      name: article.h1,
      description: deal.reward,
      url,
      price: 0,
      priceCurrency: "USD",
      availability:
        passes.length > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/LimitedAvailability",
      seller: { "@type": "Organization", name: "Claude Coupons" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Referral codes", item: `${SITE_URL}/referral-codes` },
        { "@type": "ListItem", position: 2, name: deal.name, item: url },
      ],
    },
  ];

  return (
    <>
      {schema.map((entry, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
        />
      ))}

      <section className="pt-7 pb-2">
        <h1 className="text-[38px] leading-tight font-bold">{article.h1}</h1>
      </section>

      {/* The list is the ask; the board under it is the proof. When the board has codes
          that shows the list works, and when it is empty the card says why joining is the
          only move - so the card comes first in both cases. */}
      <div className="mt-6">
        <PassListCard
          deal={deal}
          livePasses={passes.length}
          inLine={inLine}
          joinWave={joinWave}
          served={served}
          joinedToday={today}
          standing={standing}
          openWave={passes[0]?.openWave ?? 0}
          speed={speed}
          signedIn={Boolean(user)}
          email={user?.email}
          confirmed={false}
        />
      </div>

      <div className="mt-6 max-w-2xl text-[19px] text-muted [&_p+p]:mt-3">
        {article.lead.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-2">
        <section className="flex flex-col rounded-2xl border border-line bg-surface px-6 py-7">
          <h2 className="mb-4 text-2xl font-semibold">
            Available {deal.name} {deal.nounPlural}
          </h2>
          {/* Branched here rather than inside Board: an empty board needs none of the
              carousel, unlock or outcome machinery. */}
          {passes.length === 0 ? (
            <EmptyBoard deal={deal} />
          ) : (
            <Board passes={passes} myWave={standing?.wave ?? null} deal={deal} />
          )}
        </section>

        <ShareCard deal={deal} />
      </div>

      <ShareCta deal={deal} />

      <section className="mt-14 max-w-3xl [&_h2]:mt-9 [&_h2]:mb-2.5 [&_h2]:text-[23px] [&_h2]:font-semibold [&_p]:mt-3">
        {/* The answer box: the rows a search result may lift whole. */}
        <h2 className="!mt-0">{deal.name} at a glance</h2>
        <dl className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {article.facts.map(({ term, def }) => (
            <div key={term} className="grid gap-x-5 gap-y-0.5 px-5 py-3 sm:grid-cols-[15rem_1fr]">
              <dt className="font-semibold">{term}</dt>
              <dd className="text-muted">{def}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted">{article.factsNote}</p>

        {article.sections.map((section) => (
          <div key={section.h2}>
            <h2>{section.h2}</h2>
            {section.body?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.steps && <Steps steps={section.steps} />}
            {section.bullets && (
              <ul className="mt-3 list-disc space-y-1.5 pl-6">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        ))}

        <h2 id="faq">{article.faqHeading}</h2>
        <dl>
          {article.faqs.map(({ q, a }) => (
            <div key={q}>
              <dt className="mt-4 font-semibold">{q}</dt>
              <dd className="mt-1">{a}</dd>
            </div>
          ))}
        </dl>

        {/* Internal linking that is also useful: somebody who came for one code is often
            the same person who would take another. */}
        <h2>Other codes on the board</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-6">
          <li>
            <Link className="text-accent-dark underline" href="/">
              Claude Code passes
            </Link>{" "}
            - a free week of Claude Pro.
          </li>
          {OTHER_DEALS.filter((other) => other.slug !== deal.slug).map((other) => (
            <li key={other.slug}>
              <Link className="text-accent-dark underline" href={other.path}>
                {other.name} {other.nounPlural}
              </Link>{" "}
              - {other.reward}.
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
