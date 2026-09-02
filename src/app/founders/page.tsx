import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Types } from "mongoose";

import { isAdmin } from "@/lib/admin";
import { getUser } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { progress } from "@/lib/products";
import OwnershipRequest, { OWNERSHIP_STATUS } from "@/models/OwnershipRequest";
import Product, { PRODUCT_STATUS } from "@/models/Product";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Founders - Claude Coupons",
  robots: { index: false },
};

export default async function FoundersPage() {
  const user = await getUser();
  if (!user) redirect("/signin?return_to=%2Ffounders");

  await dbConnect();
  const userId = new Types.ObjectId(user.id);
  const mine = await Product.find({ ownerUserId: userId, status: PRODUCT_STATUS.published }).sort({ confirmedCount: -1 });
  const requests = await OwnershipRequest.find({ userId, status: OWNERSHIP_STATUS.pending });
  const pendingProducts = requests.length
    ? await Product.find({ _id: { $in: requests.map((r) => r.productId) } }).select("name slug")
    : [];

  return (
    <section className="mx-auto mt-8 max-w-2xl">
      <h1 className="text-[28px] font-bold">Your product pages</h1>
      <p className="mt-1">
        Signed in as <strong>{user.email}</strong>.
      </p>

      {mine.length === 0 ? (
        <p className="mt-4">
          You don&rsquo;t manage any pages yet.{" "}
          <Link className="text-accent-dark underline" href="/founders/new">
            Create one
          </Link>
          , or claim the page that already exists for your product from its{" "}
          <Link className="text-accent-dark underline" href="/coupons">
            listing
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-line rounded-2xl border border-line bg-surface">
          {mine.map((p) => {
            const pr = progress(p);
            return (
              <li key={p._id.toString()} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div>
                  <Link className="font-semibold text-accent-dark underline" href={`/founders/${p.slug}`}>
                    {p.name}
                  </Link>
                  <p className="text-sm text-muted">
                    {pr.n} of {pr.threshold} waiting &middot; {p.poolCapacity} codes loaded &middot; {p.dropCount} drop{p.dropCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Link className="text-sm text-muted hover:text-accent-dark" href={`/coupons/${p.slug}`}>
                  View page &rarr;
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pendingProducts.length > 0 && (
        <p className="mt-4 text-sm text-muted">
          Waiting on a check: {pendingProducts.map((p) => p.name).join(", ")}. You&rsquo;ll get an email either way.
        </p>
      )}

      <p className="mt-6">
        <Link className="inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-white no-underline hover:bg-accent-dark" href="/founders/new">
          Add a product
        </Link>
      </p>
      {isAdmin(user) && (
        <p className="mt-3 text-sm text-muted">
          You&rsquo;re an admin: every page is yours to manage from{" "}
          <Link className="text-accent-dark underline" href="/admin">
            the admin page
          </Link>
          .
        </p>
      )}
    </section>
  );
}
