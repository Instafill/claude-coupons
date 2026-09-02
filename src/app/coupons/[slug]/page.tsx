import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import DropContract from "@/components/coupons/DropContract";
import ProductLive from "@/components/coupons/ProductLive";
import ProductLogo from "@/components/coupons/ProductLogo";
import StateBadge from "@/components/coupons/StateBadge";
import { getUser } from "@/lib/auth";
import { offerSummary } from "@/lib/coupons";
import { listDrops } from "@/lib/drops";
import { productDescription, productJsonLd, productMetadata, templateFaqs } from "@/lib/product-seo";
import {
  describeDuration,
  getCurrentDrop,
  getProductBySlug,
  pageState,
  progress as computeProgress,
  toPublicDrop,
  toPublicProduct,
} from "@/lib/products";
import { consentText } from "@/lib/subscribers";
import { DROP_STATUS } from "@/models/Drop";

// The SEO unit of the marketplace. Rendered fresh on every request (the layout reads
// cookies, so nothing on this site is static anyway) but identical for every visitor: the
// personal parts live in ProductLive and arrive through /me.
export const dynamic = "force-dynamic";

// Metadata and the page body need the same rows; React's cache dedupes within a request.
const load = cache(async (slug: string) => {
  const product = await getProductBySlug(slug);
  if (!product) return null;
  const drop = await getCurrentDrop(product);
  const state = pageState(product, drop);
  // What is on the table: the live drop's codes while one runs, otherwise whatever is
  // pooled for the next one - never the codes of a drop that has already gone.
  const offer = await offerSummary(product._id, state === "live" ? drop?._id : null);
  return { product, drop, state, progress: computeProgress(product), offer };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "Not found", robots: { index: false } };
  return productMetadata({
    product: toPublicProduct(data.product),
    drop: toPublicDrop(data.drop),
    state: data.state,
    progress: data.progress,
    offer: data.offer,
  });
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();

  const { product: doc, drop: dropDoc, state, progress, offer } = data;
  const product = toPublicProduct(doc);
  const drop = toPublicDrop(dropDoc);
  const user = await getUser();
  const pastDrops = (await listDrops(doc._id)).filter((d) => d.status === DROP_STATUS.exhausted || d.status === DROP_STATUS.released);

  const faqs = [...(product.faqs ?? []), ...templateFaqs(product, progress)];
  const description = productDescription(product, drop, state, progress, offer);
  const schema = productJsonLd({ product, drop, state, faqs, description, offer });
  const paragraphs = product.description.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <>
      {schema.map((entry, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }} />
      ))}

      <nav aria-label="Breadcrumb" className="pt-6 text-[13px] text-muted">
        <Link className="hover:text-accent-dark" href="/coupons">
          Coupons
        </Link>{" "}
        / {product.name}
      </nav>

      <section className="mt-3 flex items-start gap-4">
        <ProductLogo name={product.name} logoUrl={product.logoUrl} size={64} />
        <div className="min-w-0">
          <h1 className="text-[32px] leading-tight font-bold">{product.name} coupons and deal drops</h1>
          <p className="mt-1.5 text-[18px] text-muted">{product.tagline}</p>
          <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
            <StateBadge state={state} />
            <a className="text-accent-dark underline" href={product.websiteUrl} rel="noopener nofollow" target="_blank">
              {product.websiteDomain}
            </a>
          </p>
          {!product.owned && (
            // The first-screen sentence that keeps a pre-claim page honest with visitors,
            // founders and trademark holders alike.
            <p className="mt-3 text-[15px] text-muted">
              <strong className="text-ink">Not an official {product.name} page.</strong> Set up by Claude
              Coupons so people can ask {product.name} for a deal in one place. No codes are promised until
              the makers{" "}
              <Link className="text-accent-dark underline" href={`/founders/claim/${product.slug}`}>
                claim this page
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <div>
          <ProductLive
            product={product}
            initial={{ progress, drop, state, hasCodes: product.poolCapacity > 0 }}
            signedIn={Boolean(user)}
            sessionEmail={user?.email}
            consent={consentText(product.name)}
          />
          <DropContract product={product} drop={drop} state={state} progress={progress} offer={offer} />
        </div>

        <aside className="rounded-2xl bg-ink px-6 py-6 text-paper">
          <p className="text-[13px] font-semibold tracking-wider text-accent uppercase">How a drop works</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] text-white/80">
            <li>Leave an email and confirm it once. That is your place in line.</li>
            <li>The page shows how many are waiting and how many unlock the drop.</li>
            <li>When {product.name} releases, everyone on the list gets one email at the same second.</li>
            <li>Each person can claim one code until they run out. Miss it, and you stay on for the next drop.</li>
          </ol>
          <p className="mt-4 text-[13px] text-white/50">
            Every email carries a one-click stop link. We never share your address - not even with {product.name}.
          </p>
        </aside>
      </div>

      <section className="mt-12 max-w-3xl [&_h2]:mt-9 [&_h2]:mb-2.5 [&_h2]:text-[23px] [&_h2]:font-semibold [&_p]:mt-3">
        <h2>About {product.name}</h2>
        {paragraphs.map((text, i) => (
          <p key={i}>{text}</p>
        ))}

        {pastDrops.length > 0 && (
          <>
            <h2>Past {product.name} drops</h2>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              {pastDrops.map((d) => (
                <li key={d._id.toString()}>
                  <strong>Drop #{d.number}</strong>
                  {d.releasedAt ? ` on ${d.releasedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}:{" "}
                  {d.capacity} codes to {d.subscribersAtRelease} people
                  {d.status === DROP_STATUS.exhausted && d.releasedAt && d.exhaustedAt
                    ? `, all claimed in ${describeDuration(d.exhaustedAt.getTime() - d.releasedAt.getTime())}`
                    : `, ${d.claimedCount} claimed`}
                  .
                </li>
              ))}
            </ul>
          </>
        )}

        <h2 id="faq">{product.name} coupon questions</h2>
        <dl>
          {faqs.map(({ q, a }) => (
            <div key={q}>
              <dt className="mt-4 font-semibold">{q}</dt>
              <dd className="mt-1">{a}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 border-t border-line pt-5 text-sm text-muted">
          {product.owned ? (
            <>This page is managed by {product.name}&rsquo;s team. </>
          ) : (
            <>
              From {product.name}?{" "}
              <Link className="text-accent-dark underline" href={`/founders/claim/${product.slug}`}>
                Claim this page
              </Link>{" "}
              with a work email and load your own codes.{" "}
            </>
          )}
          Something wrong here?{" "}
          <a className="text-accent-dark underline" href={`mailto:hello@claudecoupons.com?subject=${encodeURIComponent(`Report: /coupons/${product.slug}`)}`}>
            Report this page
          </a>
          . Product names and logos belong to their owners.
        </p>
      </section>
    </>
  );
}
