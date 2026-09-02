import Link from "next/link";

import ProductLogo from "@/components/coupons/ProductLogo";
import StateBadge from "@/components/coupons/StateBadge";
import { progress as computeProgress } from "@/lib/product-state";
import type { PageState, PublicDrop, PublicProduct } from "@/lib/product-state";

export default function ProductCard({
  product,
  drop,
  state,
}: {
  product: PublicProduct;
  drop: PublicDrop | null;
  state: PageState;
}) {
  const progress = computeProgress(product);
  const line =
    state === "live" && drop
      ? `${drop.remaining} of ${drop.capacity} codes left`
      : progress.band === "goal"
        ? `${progress.n} waiting - goal reached`
        : progress.band === "many"
          ? `${progress.n} of ${progress.threshold} waiting`
          : `${progress.threshold} people unlock the drop`;

  return (
    <Link
      href={`/coupons/${product.slug}`}
      className="flex gap-4 rounded-2xl border border-line bg-surface px-5 py-4 no-underline hover:border-accent"
    >
      <ProductLogo name={product.name} logoUrl={product.logoUrl} size={48} />
      <div className="min-w-0">
        <p className="truncate text-[17px] font-semibold">{product.name}</p>
        <p className="mt-0.5 line-clamp-2 text-[14px] text-muted">{product.tagline}</p>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
          <StateBadge state={state} />
          <span className="text-muted">{line}</span>
        </p>
      </div>
    </Link>
  );
}
