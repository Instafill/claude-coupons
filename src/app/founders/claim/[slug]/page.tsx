import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import ClaimOwnershipForm from "@/components/founders/ClaimOwnershipForm";
import { getUser } from "@/lib/auth";
import { emailDomain, isFreemail, registrableDomain } from "@/lib/domains";
import { isOwner } from "@/lib/ownership";
import { getProductBySlug, progress } from "@/lib/products";
import { CONTACT_EMAIL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Claim this page - Claude Coupons",
  robots: { index: false },
};

export default async function ClaimPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const user = await getUser();
  if (!user) redirect(`/signin?return_to=${encodeURIComponent(`/founders/claim/${slug}`)}`);
  if (isOwner(product, user)) redirect(`/founders/${slug}`);

  const pr = progress(product);
  const domainMatches = !isFreemail(user.email) && registrableDomain(emailDomain(user.email)) === product.websiteDomain;

  return (
    <section className="mx-auto mt-8 max-w-2xl">
      <h1 className="text-[28px] font-bold">Claim the {product.name} page</h1>
      {product.ownerUserId ? (
        <p className="mt-3">
          This page already has an owner. If that&rsquo;s wrong, email{" "}
          <a className="text-accent-dark underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>{" "}
          from an address on {product.websiteDomain}.
        </p>
      ) : (
        <>
          <p className="mt-2 text-muted">
            {pr.n > 0 ? `${pr.n} people are waiting for ${product.name} codes. ` : ""}
            Claiming the page lets you load codes, set the goal and release drops. You keep your checkout
            and your customers; we keep the list and send one email per drop. The page stops saying
            &ldquo;unofficial&rdquo; the moment it&rsquo;s yours.
          </p>
          <ClaimOwnershipForm
            slug={product.slug}
            productName={product.name}
            domain={product.websiteDomain}
            email={user.email}
            domainMatches={domainMatches}
          />
          <p className="mt-6 text-sm text-muted">
            Not you?{" "}
            <Link className="text-accent-dark underline" href={`/coupons/${product.slug}`}>
              Back to the page
            </Link>
            .
          </p>
        </>
      )}
    </section>
  );
}
