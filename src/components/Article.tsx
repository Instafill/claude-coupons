import Link from "next/link";

import { SITE_URL } from "@/lib/seo";

// The shared chrome for every long-form page: JSON-LD, the prose column and its heading
// rhythm, the answer-box table, the FAQ list and the closing card. A page supplies its
// own words and nothing else, so the two never drift apart visually or in what they emit.

export interface Fact {
  term: string;
  def: React.ReactNode;
}

/** The answer box at the top of an article - the rows a search result may lift. */
export function FactTable({
  rows,
  note,
}: {
  rows: Fact[];
  note?: React.ReactNode;
}) {
  return (
    <>
      <dl className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {rows.map(({ term, def }) => (
          <div
            key={term}
            className="grid gap-x-5 gap-y-0.5 px-5 py-3 sm:grid-cols-[15rem_1fr]"
          >
            <dt className="font-semibold">{term}</dt>
            <dd className="text-muted">{def}</dd>
          </div>
        ))}
      </dl>
      {note && <p className="text-sm text-muted">{note}</p>}
    </>
  );
}

export interface ArticleProps {
  /** Visible headline. Deliberately separate from the <title> tag, which targets the SERP. */
  h1: string;
  description: string;
  path: string;
  /** The opening paragraphs, set larger than the body. */
  lead: React.ReactNode;
  faqs: { q: string; a: string }[];
  faqHeading: string;
  cta?: { heading: string; body: React.ReactNode; label: string };
  children: React.ReactNode;
}

const DEFAULT_CTA = {
  heading: "Get a pass",
  body: "Subscribers list spare passes here so they don’t expire unused. Unlock one, redeem it on claude.ai, and tell us whether it worked.",
  label: "See available Claude passes",
};

export default function Article({
  h1,
  description,
  path,
  lead,
  faqs,
  faqHeading,
  cta = DEFAULT_CTA,
  children,
}: ArticleProps) {
  const url = `${SITE_URL}${path}`;
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: h1,
      description,
      mainEntityOfPage: url,
      author: { "@type": "Organization", name: "Claude Coupons" },
      publisher: { "@type": "Organization", name: "Claude Coupons" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
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

      <article className="mx-auto mt-8 max-w-3xl [&_h2]:mt-10 [&_h2]:mb-2.5 [&_h2]:text-[23px] [&_h2]:font-semibold [&_p]:mt-3">
        <h1 className="text-[28px] leading-tight font-bold sm:text-[34px]">
          {h1}
        </h1>

        <div className="[&_p]:text-[19px] [&_p]:text-muted">{lead}</div>

        {children}

        <h2 id="faq">{faqHeading}</h2>
        <dl>
          {faqs.map(({ q, a }) => (
            <div key={q}>
              <dt className="mt-4 font-semibold">{q}</dt>
              <dd className="mt-1">{a}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 rounded-2xl border border-line bg-surface px-6 py-6">
          <h2 className="!mt-0">{cta.heading}</h2>
          <p className="!mt-1">{cta.body}</p>
          <Link
            className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-white no-underline hover:bg-accent-dark"
            href="/"
          >
            {cta.label}
          </Link>
        </div>
      </article>
    </>
  );
}
