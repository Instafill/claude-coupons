import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug, formatDate, getAuthorInitials } from "@/lib/blog";
import { SITE_URL } from "@/lib/seo";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Article Not Found | Claude Coupons Blog",
    };
  }

  const url = `${SITE_URL}/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.metaDescription,
    alternates: { canonical: url },
    keywords: post.keywords,
    openGraph: {
      type: "article",
      url,
      siteName: "Claude Coupons",
      title: post.title,
      description: post.metaDescription,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: post.imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.metaDescription,
      images: ["/og.png"],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const articleUrl = `${SITE_URL}/blog/${post.slug}`;

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.h1,
      description: post.metaDescription,
      url: articleUrl,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": articleUrl,
      },
      image: `${SITE_URL}/og.png`,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: {
        "@type": "Person",
        name: post.author.name,
        jobTitle: post.author.role,
        url: post.author.url || SITE_URL,
      },
      publisher: {
        "@type": "Organization",
        name: "Claude Coupons",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/logo-256.png`,
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: `${SITE_URL}/blog`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: post.h1,
          item: articleUrl,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a,
        },
      })),
    },
  ];

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="pt-6 pb-2 text-sm text-muted flex flex-wrap items-center gap-2"
      >
        <Link href="/" className="hover:text-accent-dark transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-accent-dark transition-colors">
          Blog
        </Link>
        <span>/</span>
        <span className="text-ink font-medium truncate max-w-[280px] sm:max-w-md">
          {post.h1}
        </span>
      </nav>

      <article className="pt-4 pb-12 w-full">
        {/* Header metadata */}
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted mb-3">
            <span className="rounded-full bg-accent/10 px-3 py-0.5 font-semibold text-accent-dark">
              {post.category}
            </span>
            <span>•</span>
            <span className="text-good font-medium">Verified Active</span>
            <span>•</span>
            <time dateTime={post.updatedAt} className="text-muted font-medium">
              Updated {formatDate(post.updatedAt)}
            </time>
            <span>•</span>
            <span>{post.readingTime}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-ink leading-tight">
            {post.h1}
          </h1>

          <div className="mt-5 flex items-center justify-between gap-4 border-y border-line py-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-line flex items-center justify-center font-bold text-accent-dark">
                {getAuthorInitials(post.author.name)}
              </div>
              <div>
                <div className="font-semibold text-ink">{post.author.name}</div>
                <div className="text-xs text-muted">{post.author.role}</div>
              </div>
            </div>
            <div className="text-xs text-muted text-right">
              <div>Fact-Checked & Verified</div>
              <div className="font-medium text-ink">September 2026</div>
            </div>
          </div>
        </header>

        {/* Key Takeaways Callout Box */}
        <div className="my-6 rounded-2xl border border-accent/20 bg-accent/5 p-5 sm:p-6">
          <h2 className="text-base font-bold uppercase tracking-wider text-accent-dark mb-2">
            Key Takeaways (TL;DR)
          </h2>
          <ul className="space-y-2 text-sm sm:text-base text-ink leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-bad font-bold">❌</span>
              <span>
                <strong>No coupon codes exist at checkout:</strong> Claude uses Stripe
                with the coupon input disabled. Any site promising &ldquo;50% off
                codes&rdquo; is fake.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-good font-bold">✅</span>
              <span>
                <strong>The #1 working method for Claude Pro:</strong> Use an official{" "}
                <Link href="/" className="font-semibold text-accent-dark underline">
                  Claude Guest Pass
                </Link>{" "}
                (7 days free of Claude Pro, Claude Code and Cowork included).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-good font-bold">✅</span>
              <span>
                <strong>For Startups & Developers:</strong> Get $5,000+ through AWS
                Activate for Claude on Amazon Bedrock, or apply to Claude for Startups.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-good font-bold">✅</span>
              <span>
                <strong>For Nonprofits & Labs:</strong> Claude for Nonprofits offers Team
                seats at $8/user/mo (60%+ off), plus grants for scientific researchers.
              </span>
            </li>
          </ul>
        </div>

        {/* Table of Contents */}
        <nav aria-label="Table of Contents" className="my-8 rounded-2xl border border-line bg-surface p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
            In This Guide
          </div>
          <ol className="grid gap-2 text-sm sm:grid-cols-2">
            {post.sections.map((section, idx) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-muted hover:text-accent-dark transition-colors flex items-center gap-1.5"
                >
                  <span className="font-mono text-xs text-accent">{idx + 1}.</span>
                  <span>{section.h2}</span>
                </a>
              </li>
            ))}
            <li>
              <a
                href="#faqs"
                className="text-muted hover:text-accent-dark transition-colors flex items-center gap-1.5"
              >
                <span className="font-mono text-xs text-accent">
                  {post.sections.length + 1}.
                </span>
                <span>Frequently Asked Questions</span>
              </a>
            </li>
          </ol>
        </nav>

        {/* Main Sections */}
        <div className="space-y-12">
          {post.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-12">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-4 pb-2 border-b border-line">
                {section.h2}
              </h2>

              {section.lead && (
                <p className="text-lg text-ink font-medium leading-relaxed mb-4">
                  {section.lead}
                </p>
              )}

              {/* Body Paragraphs */}
              {section.body && (
                <div className="space-y-4 text-ink leading-relaxed">
                  {section.body.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))}
                </div>
              )}

              {/* Status Matrix Table */}
              {section.table && (
                <div className="my-6 overflow-hidden rounded-2xl border border-line bg-surface">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-line bg-line/30 font-semibold text-ink">
                          {section.table.columns.map((col) => (
                            <th key={col.key} className="px-4 py-3 sm:px-5">
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {section.table.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className="hover:bg-line/20 transition-colors"
                          >
                            <td className="px-4 py-3 sm:px-5 font-semibold text-ink">
                              {row.deal}
                            </td>
                            <td className="px-4 py-3 sm:px-5 text-muted">
                              {row.target}
                            </td>
                            <td className="px-4 py-3 sm:px-5 font-medium text-ink">
                              {row.value}
                            </td>
                            <td className="px-4 py-3 sm:px-5 whitespace-nowrap text-xs font-semibold">
                              <span
                                className={`inline-block rounded-md px-2 py-1 ${
                                  row.status.includes("✅")
                                    ? "bg-good/10 text-good"
                                    : row.status.includes("❌")
                                    ? "bg-bad/10 text-bad"
                                    : "bg-line text-muted"
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {section.table.caption && (
                    <div className="px-4 py-2.5 text-xs text-muted border-t border-line/50 bg-paper/50">
                      {section.table.caption}
                    </div>
                  )}
                </div>
              )}

              {/* Callout box */}
              {section.callout && (
                <div
                  className={`my-6 rounded-2xl p-5 border ${
                    section.callout.type === "warning"
                      ? "border-bad/30 bg-bad/5 text-ink"
                      : section.callout.type === "tip"
                      ? "border-good/30 bg-good/5 text-ink"
                      : "border-accent/30 bg-accent/5 text-ink"
                  }`}
                >
                  <div
                    className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                      section.callout.type === "warning"
                        ? "text-bad"
                        : section.callout.type === "tip"
                        ? "text-good"
                        : "text-accent-dark"
                    }`}
                  >
                    {section.callout.title}
                  </div>
                  <p className="text-sm leading-relaxed">{section.callout.text}</p>
                </div>
              )}

              {/* Steps (if any) */}
              {section.steps && (
                <div className="my-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
                  <div className="font-semibold text-ink mb-3 text-sm uppercase tracking-wide text-muted">
                    How to Claim Your Free 7-Day Pass
                  </div>
                  <ol className="list-decimal space-y-3 pl-5 text-sm sm:text-base leading-relaxed text-ink">
                    {section.steps.map((step, sIdx) => (
                      <li key={sIdx} className="pl-1">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Dedicated CTA for Guest Passes section */}
              {section.id === "the-real-solution-guest-passes" && (
                <div className="my-8 rounded-2xl border-2 border-accent bg-paper p-6 sm:p-8 text-center flex flex-col items-center">
                  <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-dark mb-2">
                    Live Community Exchange
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-ink max-w-xl">
                    Claim 7 Days of Claude Pro with Claude Code Included
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-muted max-w-md">
                    Take a number in our automated queue. Unlock a pass when your wave
                    opens and activate it on claude.ai for $0.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
                    <Link
                      href="/"
                      className="rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-xs hover:bg-accent-dark transition-colors"
                    >
                      Enter the Free Pass Queue →
                    </Link>
                    <Link
                      href="/claude-guest-pass"
                      className="rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink hover:border-accent transition-colors"
                    >
                      Read Guest Pass Rules
                    </Link>
                  </div>
                </div>
              )}

              {/* Section Images (if any) */}
              {section.images && (
                <div className="my-6 space-y-6">
                  {section.images.map((img, imgIdx) => (
                    <figure
                      key={imgIdx}
                      className="overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-xs"
                    >
                      <div className="overflow-hidden rounded-xl bg-paper">
                        <Image
                          src={img.src}
                          alt={img.alt}
                          width={1200}
                          height={675}
                          className="w-full h-auto object-contain rounded-lg border border-line/40"
                        />
                      </div>
                      {img.caption && (
                        <figcaption className="px-3 pt-3 pb-1 text-center text-xs text-muted">
                          <span className="font-semibold text-ink">Verified:</span> {img.caption}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}

              {/* Subsections (if any) */}
              {section.subsections && (
                <div className="space-y-8 mt-6">
                  {section.subsections.map((sub, subIdx) => (
                    <div
                      key={subIdx}
                      className="rounded-2xl border border-line bg-surface p-5 sm:p-7"
                    >
                      <h3 className="text-lg sm:text-xl font-bold text-ink mb-3">
                        {sub.h3}
                      </h3>
                      <div className="space-y-3 text-sm sm:text-base text-ink leading-relaxed">
                        {sub.body.map((p, pIdx) => (
                          <p key={pIdx}>{p}</p>
                        ))}
                      </div>

                      {sub.bullets && (
                        <ul className="mt-4 list-disc pl-5 space-y-1.5 text-sm sm:text-base text-muted">
                          {sub.bullets.map((b, bIdx) => (
                            <li key={bIdx}>{b}</li>
                          ))}
                        </ul>
                      )}

                      {/* Subsection Images (if any) */}
                      {sub.images && (
                        <div className="mt-5 space-y-5">
                          {sub.images.map((img, imgIdx) => (
                            <figure
                              key={imgIdx}
                              className="overflow-hidden rounded-2xl border border-line bg-paper/60 p-2 shadow-xs"
                            >
                              <div className="overflow-hidden rounded-xl bg-paper">
                                <Image
                                  src={img.src}
                                  alt={img.alt}
                                  width={1200}
                                  height={675}
                                  className="w-full h-auto object-contain rounded-lg border border-line/40"
                                />
                              </div>
                              {img.caption && (
                                <figcaption className="px-3 pt-2.5 pb-1 text-center text-xs text-muted">
                                  <span className="font-semibold text-ink">Screenshot:</span>{" "}
                                  {img.caption}
                                </figcaption>
                              )}
                            </figure>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}

          {/* Frequently Asked Questions */}
          <section id="faqs" className="scroll-mt-12 pt-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-6 pb-2 border-b border-line">
              Frequently Asked Questions About Claude Discounts
            </h2>

            <dl className="space-y-4">
              {post.faqs.map((faq, fIdx) => (
                <div
                  key={fIdx}
                  className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
                >
                  <dt className="text-base sm:text-lg font-bold text-ink mb-2">
                    {faq.q}
                  </dt>
                  <dd className="text-sm sm:text-base text-muted leading-relaxed">
                    {faq.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Author Bio Box */}
          <footer className="mt-12 rounded-2xl border border-line bg-surface p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-accent/15 shrink-0 flex items-center justify-center font-bold text-xl text-accent-dark">
              {getAuthorInitials(post.author.name)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-ink text-base">
                  {post.author.name}
                </span>
                <span className="text-xs text-muted">•</span>
                <span className="text-xs text-muted">{post.author.role}</span>
              </div>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                {post.author.bio}
              </p>
              {post.author.url && (
                <div className="mt-3">
                  <a
                    href={post.author.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-accent-dark hover:underline"
                  >
                    Follow on X / Twitter →
                  </a>
                </div>
              )}
            </div>
          </footer>

          {/* Next Steps CTA */}
          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 text-center">
            <h3 className="text-xl font-bold text-ink mb-2">
              Have Spare Claude Guest Passes?
            </h3>
            <p className="text-sm text-muted max-w-md mx-auto mb-4">
              Don&rsquo;t let your monthly passes expire unused. Share them on our
              board and help students, builders, and researchers experience Claude Pro.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/submit"
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-accent-dark transition-colors"
              >
                Share a Pass
              </Link>
              <Link
                href="/blog"
                className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:bg-paper transition-colors"
              >
                ← Back to Blog
              </Link>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
