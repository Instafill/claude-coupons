import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, formatDate, getAuthorInitials } from "@/lib/blog";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI Promo Codes, Discounts & Referral Guides | Claude Coupons Blog",
  description:
    "The honest guide to AI promo codes, startup credits, and referral passes. Verified data on Claude Pro discounts, AWS Bedrock credits, and community referral exchanges.",
  alternates: { canonical: `${SITE_URL}/blog` },
  keywords: [
    "claude blog",
    "claude promo code blog",
    "ai promo codes",
    "claude discounts",
    "claude startup credits",
    "claude guest passes",
    "ai referral codes",
  ],
  openGraph: {
    type: "website",
    url: `${SITE_URL}/blog`,
    siteName: "Claude Coupons",
    title: "AI Promo Codes, Discounts & Referral Guides | Claude Coupons Blog",
    description:
      "The honest guide to AI promo codes, startup credits, and referral passes. Verified data on Claude Pro discounts, AWS Bedrock credits, and community referral exchanges.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Claude Coupons Blog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Promo Codes, Discounts & Referral Guides | Claude Coupons Blog",
    description:
      "The honest guide to AI promo codes, startup credits, and referral passes. Verified data on Claude Pro discounts, AWS Bedrock credits, and community referral exchanges.",
    images: ["/og.png"],
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const featuredPost = posts.find((p) => p.featured) || posts[0];
  const regularPosts = posts.filter((p) => p.slug !== featuredPost.slug);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Claude Coupons Blog",
    description:
      "Honest teardowns of AI promo codes, API discounts, and referral programs that actually pay out.",
    url: `${SITE_URL}/blog`,
    publisher: {
      "@type": "Organization",
      name: "Claude Coupons",
      url: SITE_URL,
      logo: `${SITE_URL}/logo-256.png`,
    },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.h1,
      description: post.metaDescription,
      url: `${SITE_URL}/blog/${post.slug}`,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: {
        "@type": "Person",
        name: post.author.name,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <nav
        aria-label="Breadcrumb"
        className="pt-6 pb-2 text-sm text-muted flex items-center gap-2"
      >
        <Link href="/" className="hover:text-accent-dark transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-ink font-medium">Blog</span>
      </nav>

      <section className="pt-4 pb-8">
        <div className="flex flex-col gap-2">
          <span className="inline-block text-xs font-semibold tracking-wider uppercase text-accent">
            Research & Verified Guides
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-ink">
            ClaudeCoupons Blog
          </h1>
          <p className="mt-2 text-lg text-muted max-w-2xl leading-relaxed">
            The honest breakdown of AI promo codes, startup cloud credits, and
            community referral mechanics. No fake codes, no expired affiliate links.
          </p>
        </div>
      </section>

      {/* Featured Article Card */}
      {featuredPost && (
        <section className="mb-12">
          <div className="group relative rounded-3xl border border-line bg-surface p-6 sm:p-8 md:p-10 shadow-xs hover:border-accent/40 transition-all">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted mb-4">
              <span className="rounded-full bg-accent/10 px-3 py-1 font-semibold text-accent-dark">
                Featured Guide
              </span>
              <span>•</span>
              <span className="font-medium text-ink">{featuredPost.category}</span>
              <span>•</span>
              <time dateTime={featuredPost.updatedAt}>
                Updated {formatDate(featuredPost.updatedAt)}
              </time>
              <span>•</span>
              <span>{featuredPost.readingTime}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-ink group-hover:text-accent-dark transition-colors">
              <Link href={`/blog/${featuredPost.slug}`}>
                {featuredPost.h1}
              </Link>
            </h2>

            <p className="mt-3 text-muted leading-relaxed sm:text-lg max-w-3xl">
              {featuredPost.summary}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-line/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-line/80 flex items-center justify-center font-bold text-sm text-accent-dark">
                  {getAuthorInitials(featuredPost.author.name)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {featuredPost.author.name}
                  </div>
                  <div className="text-xs text-muted">
                    {featuredPost.author.role}
                  </div>
                </div>
              </div>

              <Link
                href={`/blog/${featuredPost.slug}`}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-accent-dark transition-colors"
              >
                <span>Read Full Guide</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Callout Card: Try our Free Guest Pass Exchange */}
      <section className="mb-12 rounded-2xl border border-accent/20 bg-accent/5 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="text-xs font-bold uppercase tracking-wider text-accent-dark mb-1">
            Looking for Free Claude Pro?
          </div>
          <h3 className="text-xl font-bold text-ink">
            Skip the coupon search — unlock a real 7-day Claude Pro guest pass
          </h3>
          <p className="mt-1 text-sm text-muted">
            Subscribers list their spare Claude Code & Cowork guest passes here so they don’t
            expire. Take a number in our queue and unlock one when your wave opens.
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper shadow-xs hover:bg-black transition-colors"
        >
          View Live Passes & Queue →
        </Link>
      </section>

      {/* Regular posts list if more exist */}
      {regularPosts.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-ink mb-6">More Articles</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {regularPosts.map((post) => (
              <article
                key={post.slug}
                className="rounded-2xl border border-line bg-surface p-6 hover:border-accent/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted mb-2">
                    <span className="font-semibold text-accent-dark">
                      {post.category}
                    </span>
                    <span>•</span>
                    <span>{post.readingTime}</span>
                  </div>
                  <h3 className="text-xl font-bold text-ink hover:text-accent-dark transition-colors">
                    <Link href={`/blog/${post.slug}`}>{post.h1}</Link>
                  </h3>
                  <p className="mt-2 text-sm text-muted line-clamp-3">
                    {post.summary}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-line text-xs text-muted flex items-center justify-between">
                  <span>{formatDate(post.publishedAt)}</span>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="font-semibold text-accent-dark hover:underline"
                  >
                    Read guide →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Cross-linking to our verified promo code boards */}
      <section className="mt-12 rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <h2 className="text-xl font-bold text-ink mb-2">
          Explore Our Working Referral & Promo Code Boards
        </h2>
        <p className="text-sm text-muted mb-6">
          Every board runs an automated queue where real users exchange codes that actually
          pay the person claiming them:
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/"
            className="rounded-xl border border-line p-4 hover:border-accent hover:bg-paper transition-all"
          >
            <div className="font-semibold text-ink">Claude Pro Passes</div>
            <div className="text-xs text-muted mt-1">
              7 free days of Claude Pro with Claude Code included
            </div>
          </Link>
          <Link
            href="/chatgpt-promo-code"
            className="rounded-xl border border-line p-4 hover:border-accent hover:bg-paper transition-all"
          >
            <div className="font-semibold text-ink">ChatGPT Promo Codes</div>
            <div className="text-xs text-muted mt-1">
              Personal invites and Plus referral promotions
            </div>
          </Link>
          <Link
            href="/waymo-promo-code"
            className="rounded-xl border border-line p-4 hover:border-accent hover:bg-paper transition-all"
          >
            <div className="font-semibold text-ink">Waymo Promo Codes</div>
            <div className="text-xs text-muted mt-1">
              $10 off your first autonomous robotaxi ride
            </div>
          </Link>
          <Link
            href="/uber-promo-code"
            className="rounded-xl border border-line p-4 hover:border-accent hover:bg-paper transition-all"
          >
            <div className="font-semibold text-ink">Uber Promo Codes</div>
            <div className="text-xs text-muted mt-1">
              50% off your next 2 rides (up to $10 each)
            </div>
          </Link>
          <Link
            href="/elevenlabs-promo-code"
            className="rounded-xl border border-line p-4 hover:border-accent hover:bg-paper transition-all"
          >
            <div className="font-semibold text-ink">ElevenLabs Guide</div>
            <div className="text-xs text-muted mt-1">
              The honest answer to ElevenLabs coupon codes & free tiers
            </div>
          </Link>
          <Link
            href="/referral-codes"
            className="rounded-xl border border-line p-4 hover:border-accent hover:bg-paper transition-all"
          >
            <div className="font-semibold text-ink">View All Boards →</div>
            <div className="text-xs text-muted mt-1">
              Live counts and queue status across all active deals
            </div>
          </Link>
        </div>
      </section>
    </>
  );
}
