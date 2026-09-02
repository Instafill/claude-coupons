import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { revokeCouponAction } from "@/app/founders/actions";
import CouponBulkForm from "@/components/founders/CouponBulkForm";
import ProductForm from "@/components/founders/ProductForm";
import ReleasePanel from "@/components/founders/ReleasePanel";
import ThresholdForm from "@/components/founders/ThresholdForm";
import WarrantForm from "@/components/founders/WarrantForm";
import { getUser } from "@/lib/auth";
import { listDrops } from "@/lib/drops";
import { dbConnect } from "@/lib/mongodb";
import { canManage } from "@/lib/ownership";
import { getCurrentDrop, getProductBySlug, maskEmail, progress as computeProgress, toPublicDrop } from "@/lib/products";
import Coupon, { COUPON_STATUS } from "@/models/Coupon";
import { DROP_STATUS } from "@/models/Drop";
import Subscriber from "@/models/Subscriber";

export const dynamic = "force-dynamic";
// The release fan-out runs inside this page's server action.
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Manage product - Claude Coupons",
  robots: { index: false },
};

const STATUS_STYLE: Record<string, string> = {
  pool: "bg-[#f0ede6] text-muted",
  live: "bg-[#e2f2e9] text-good",
  exhausted: "bg-[#f9e5e0] text-bad",
  revoked: "bg-[#f9e5e0] text-bad",
};

export default async function ManageProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getUser();
  if (!user) redirect(`/signin?return_to=${encodeURIComponent(`/founders/${slug}`)}`);

  const product = await getProductBySlug(slug, { includeArchived: true });
  if (!product) notFound();
  if (!canManage(product, user)) redirect("/founders");

  await dbConnect();
  const drop = await getCurrentDrop(product);
  const publicDrop = toPublicDrop(drop);
  const progress = computeProgress(product);
  const [coupons, subscribers, drops, notifyRemaining] = await Promise.all([
    Coupon.find({ productId: product._id, status: { $ne: COUPON_STATUS.revoked } }).sort({ createdAt: -1 }).limit(200),
    Subscriber.find({ productId: product._id, confirmedAt: { $exists: true }, stoppedAt: { $exists: false } })
      .sort({ position: -1 })
      .limit(50)
      .select("email position confirmedAt lastNotifiedDropId"),
    listDrops(product._id),
    drop && drop.status === DROP_STATUS.releasing
      ? Subscriber.countDocuments({ productId: product._id, confirmedAt: { $exists: true }, stoppedAt: { $exists: false }, lastNotifiedDropId: { $ne: drop._id } })
      : Promise.resolve(0),
  ]);
  const pending = subscribers.length;

  return (
    <section className="mx-auto mt-8 max-w-3xl [&_h2]:mt-9 [&_h2]:text-[21px] [&_h2]:font-semibold">
      <p className="text-[13px] text-muted">
        <Link className="hover:text-accent-dark" href="/founders">
          Founders
        </Link>{" "}
        / {product.name}
      </p>
      <h1 className="mt-1 text-[28px] font-bold">{product.name}</h1>
      <p className="mt-1 text-muted">
        Public page:{" "}
        <Link className="text-accent-dark underline" href={`/coupons/${product.slug}`}>
          /coupons/{product.slug}
        </Link>
        {product.status === "archived" && <span className="ml-2 font-semibold text-bad">Archived - not public.</span>}
        {!product.ownerUserId && <span className="ml-2 text-muted">Unclaimed - you are managing it as admin.</span>}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[
          ["Waiting", `${progress.n} / ${progress.threshold}`],
          ["Total confirmed", String(product.confirmedCount)],
          ["Codes loaded", String(product.poolCapacity)],
          ["Drops", String(product.dropCount)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-surface px-4 py-3">
            <p className="text-[12px] tracking-wide text-muted uppercase">{label}</p>
            <p className="text-[22px] font-bold">{value}</p>
          </div>
        ))}
      </div>

      <h2>Release</h2>
      <ReleasePanel
        slug={product.slug}
        drop={publicDrop}
        poolCapacity={product.poolCapacity}
        waiting={progress.n}
        goalReached={progress.goalReached}
        canRelease={Boolean(product.warrantAcceptedAt)}
        notifyRemaining={notifyRemaining}
      />
      <ThresholdForm slug={product.slug} threshold={product.threshold} />

      <h2>Codes</h2>
      {product.warrantAcceptedAt ? (
        <CouponBulkForm slug={product.slug} />
      ) : (
        <WarrantForm slug={product.slug} productName={product.name} />
      )}

      {coupons.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="text-xs tracking-wide text-muted uppercase">
                {["Code", "Gives", "Status", "Claimed", ""].map((h) => (
                  <th key={h} className="border-b border-line px-2.5 py-2 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c._id.toString()}>
                  <td className="border-b border-line px-2.5 py-2 font-mono">{c.code}</td>
                  <td className="border-b border-line px-2.5 py-2">{c.label}</td>
                  <td className="border-b border-line px-2.5 py-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_STYLE[c.status] ?? ""}`}>{c.status}</span>
                  </td>
                  <td className="border-b border-line px-2.5 py-2">
                    {c.claimedCount} / {c.maxClaims}
                  </td>
                  <td className="border-b border-line px-2.5 py-2 text-right">
                    {c.status === COUPON_STATUS.pool && (
                      <form action={revokeCouponAction.bind(null, product.slug, c._id.toString())}>
                        <button type="submit" className="cursor-pointer text-[13px] text-bad hover:underline">
                          Remove
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drops.length > 0 && (
        <>
          <h2>Drops</h2>
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface text-[14px]">
            {drops.map((d) => (
              <li key={d._id.toString()} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
                <span>
                  <strong>#{d.number}</strong> {d.status}
                  {d.releasedAt ? ` · released ${d.releasedAt.toLocaleString("en-GB")}` : ""}
                </span>
                <span className="text-muted">
                  {d.claimedCount} / {d.capacity} claimed · emailed {d.notify.sent}
                  {d.notify.failed ? ` (${d.notify.failed} failed)` : ""} of {d.notify.total}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>People on the list</h2>
      <p className="mt-1 text-sm text-muted">
        Newest first, addresses masked. We never hand out the addresses - that is the promise every
        subscriber joined under, and it is why they join at all.
      </p>
      {pending === 0 ? (
        <p className="mt-3 text-muted">Nobody yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="text-xs tracking-wide text-muted uppercase">
                {["#", "Address", "Joined", "Told about drop"].map((h) => (
                  <th key={h} className="border-b border-line px-2.5 py-2 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s._id.toString()}>
                  <td className="border-b border-line px-2.5 py-2">{s.position ?? "-"}</td>
                  <td className="border-b border-line px-2.5 py-2 font-mono">{maskEmail(s.email)}</td>
                  <td className="border-b border-line px-2.5 py-2">{s.confirmedAt?.toLocaleDateString("en-GB")}</td>
                  <td className="border-b border-line px-2.5 py-2">{s.lastNotifiedDropId && drop && s.lastNotifiedDropId.equals(drop._id) ? `#${drop.number}` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Page details</h2>
      <ProductForm
        initial={{
          slug: product.slug,
          name: product.name,
          tagline: product.tagline,
          description: product.description,
          websiteUrl: product.websiteUrl,
          logoUrl: product.logoUrl ?? null,
          threshold: product.threshold,
        }}
      />
    </section>
  );
}
