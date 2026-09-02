import type { Metadata } from "next";
import Link from "next/link";

import ProductCard from "@/components/coupons/ProductCard";
import { listPublished } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const TITLE = "Coupon Drops for Software Products | Claude Coupons";
const DESCRIPTION =
  "Ask for a coupon on any software product. When enough people are waiting, the makers release codes to the whole list at once - first come, first served. Real counts, no fake scarcity.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/coupons` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/coupons`,
    siteName: "Claude Coupons",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Coupon drops" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og.png"] },
};

export default async function CouponsHub() {
  const entries = await listPublished();
  const live = entries.filter((e) => e.state === "live");
  const rest = entries.filter((e) => e.state !== "live");

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    url: `${SITE_URL}/coupons`,
    description: DESCRIPTION,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <section className="pt-7">
        <h1 className="text-[34px] leading-tight font-bold">Coupon drops for software products</h1>
        <p className="mt-3 max-w-2xl text-[18px] text-muted">
          Each page below is a list of people waiting for one product&rsquo;s codes. When the list
          reaches its goal, the makers release a batch to everyone at the same second - fewer codes
          than people, first come first served. The numbers are real, and every page says whether the
          makers have joined yet.
        </p>
        <p className="mt-3 text-[15px]">
          Make a product?{" "}
          <Link className="text-accent-dark underline" href="/founders/new">
            Create your page
          </Link>{" "}
          or claim the one that already exists for you.
        </p>
      </section>

      {live.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[22px] font-semibold">Live right now</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((e) => (
              <ProductCard key={e.product.id} product={e.product} drop={e.drop} state={e.state} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-[22px] font-semibold">{live.length > 0 ? "Waiting for a drop" : "All products"}</h2>
        {rest.length === 0 && live.length === 0 ? (
          <p className="text-muted">No product pages yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((e) => (
              <ProductCard key={e.product.id} product={e.product} drop={e.drop} state={e.state} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 max-w-3xl [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-[21px] [&_h2]:font-semibold">
        <h2>How a coupon drop works</h2>
        <ol className="list-decimal space-y-1 pl-6">
          <li>You leave an email on a product&rsquo;s page and confirm it once. That holds your place in line.</li>
          <li>The page shows how many people are waiting and how many are needed.</li>
          <li>When the makers release the drop, everyone on the list gets one email at the same moment.</li>
          <li>Each person can claim one code until they run out. Miss it, and you stay on the list for the next one.</li>
        </ol>
        <h2>Why the pages say &ldquo;unofficial&rdquo;</h2>
        <p>
          Some pages exist before the product&rsquo;s makers have joined. They collect requests so we can
          show the makers how many people want a deal. Until a page is claimed, it promises no codes, and it
          says so in its first line. Makers can claim their page in a minute with a work email.
        </p>
      </section>
    </>
  );
}
