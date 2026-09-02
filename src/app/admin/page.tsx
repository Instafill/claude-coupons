import type { Metadata } from "next";
import Link from "next/link";

import { decideOwnershipAction, setArchivedAction } from "@/app/admin/actions";
import UnofficialProductForm from "@/components/admin/UnofficialProductForm";
import { requireAdminPage } from "@/lib/admin";
import { dbConnect } from "@/lib/mongodb";
import { progress } from "@/lib/products";
import OwnershipRequest, { OWNERSHIP_STATUS } from "@/models/OwnershipRequest";
import Product, { PRODUCT_STATUS } from "@/models/Product";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin - Claude Coupons",
  robots: { index: false },
};

export default async function AdminPage() {
  await requireAdminPage("/admin");
  await dbConnect();

  const [products, requests] = await Promise.all([
    Product.find({}).sort({ status: 1, confirmedCount: -1 }),
    OwnershipRequest.find({ status: OWNERSHIP_STATUS.pending }).sort({ createdAt: 1 }),
  ]);
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  return (
    <section className="mx-auto mt-8 max-w-4xl [&_h2]:mt-9 [&_h2]:text-[21px] [&_h2]:font-semibold">
      <h1 className="text-[28px] font-bold">Admin</h1>

      <h2>Ownership requests</h2>
      {requests.length === 0 ? (
        <p className="mt-2 text-muted">None waiting.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface text-[14px]">
          {requests.map((r) => {
            const product = byId.get(r.productId.toString());
            return (
              <li key={r._id.toString()} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p>
                    <strong>{r.email}</strong> for{" "}
                    <Link className="text-accent-dark underline" href={`/coupons/${product?.slug}`}>
                      {product?.name ?? "(missing product)"}
                    </Link>{" "}
                    <span className="text-muted">({product?.websiteDomain})</span>
                  </p>
                  {r.note && <p className="mt-1 text-muted">{r.note}</p>}
                  <p className="text-[12px] text-muted">{r.createdAt.toLocaleString("en-GB")}</p>
                </div>
                <div className="flex gap-2">
                  <form action={decideOwnershipAction.bind(null, r._id.toString(), true)}>
                    <button type="submit" className="cursor-pointer rounded-lg bg-accent px-3 py-1.5 font-semibold text-white hover:bg-accent-dark">
                      Approve
                    </button>
                  </form>
                  <form action={decideOwnershipAction.bind(null, r._id.toString(), false)}>
                    <button type="submit" className="cursor-pointer rounded-lg border border-line px-3 py-1.5 font-semibold hover:border-bad hover:text-bad">
                      Reject
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h2>Products</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="text-xs tracking-wide text-muted uppercase">
              {["Product", "Owner", "Waiting", "Codes", "Drops", "Status", ""].map((h) => (
                <th key={h} className="border-b border-line px-2.5 py-2 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const pr = progress(p);
              const archived = p.status === PRODUCT_STATUS.archived;
              return (
                <tr key={p._id.toString()} className={archived ? "text-muted" : ""}>
                  <td className="border-b border-line px-2.5 py-2">
                    <Link className="font-semibold text-accent-dark underline" href={`/founders/${p.slug}`}>
                      {p.name}
                    </Link>
                    <span className="ml-2 text-[12px] text-muted">/{p.slug} · {p.source}</span>
                  </td>
                  <td className="border-b border-line px-2.5 py-2">{p.ownerUserId ? "claimed" : "unclaimed"}</td>
                  <td className="border-b border-line px-2.5 py-2">
                    {pr.n} / {pr.threshold}
                  </td>
                  <td className="border-b border-line px-2.5 py-2">{p.poolCapacity}</td>
                  <td className="border-b border-line px-2.5 py-2">{p.dropCount}</td>
                  <td className="border-b border-line px-2.5 py-2">{p.status}</td>
                  <td className="border-b border-line px-2.5 py-2 text-right">
                    <form action={setArchivedAction.bind(null, p._id.toString(), !archived)}>
                      <button type="submit" className={`cursor-pointer text-[13px] hover:underline ${archived ? "text-good" : "text-bad"}`}>
                        {archived ? "Restore" : "Archive"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>Create an unofficial page</h2>
      <p className="mt-1 text-sm text-muted">
        For a product whose makers haven&rsquo;t joined. It goes public at once, labelled unofficial, and
        promises no codes until claimed. For many at a time, use <code>scripts/import-products.mjs</code>.
      </p>
      <UnofficialProductForm />
    </section>
  );
}
