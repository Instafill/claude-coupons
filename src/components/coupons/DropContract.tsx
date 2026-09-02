import type { OfferSummary } from "@/lib/product-seo";
import type { PageState, Progress, PublicDrop, PublicProduct } from "@/lib/product-state";

// The rules, above the email box, before anyone types. How many codes, how many people,
// how winners are chosen, what happens if you miss. The scarcity is the pitch, and it is
// only allowed to be a pitch because it is written here in plain words first.
export default function DropContract({
  product,
  drop,
  state,
  progress,
  offer,
}: {
  product: PublicProduct;
  drop: PublicDrop | null;
  state: PageState;
  progress: Progress;
  offer: OfferSummary;
}) {
  const live = state === "live" && drop;
  const codes = live ? `${drop.remaining} of ${drop.capacity} codes still unclaimed` : offer.count > 0 ? `${offer.count} codes loaded` : product.owned ? "Founders haven't loaded codes yet" : "Founders haven't joined yet - no codes are promised";
  const gets = offer.labels.length > 0 ? offer.labels.join(", ") : product.owned ? `Whatever ${product.name} loads - a discount, free days, or credit` : "Whatever the makers decide to offer once they claim the page";
  const list = progress.goalReached
    ? `${progress.n} waiting - goal of ${progress.threshold} reached`
    : `${progress.n} of ${progress.threshold} needed to unlock the drop`;

  const rows: [string, string][] = [
    [live ? "This drop" : "Next drop", codes],
    ["On the list", list],
    ["What you can get", gets],
    [
      "How it works",
      `The email goes to everyone on the list at the same second. Each person can claim one code, first come first served, until they run out. There are fewer codes than people.`,
    ],
    ["If you miss it", "You stay on the list for the next drop. We never sell or share your address, with anyone."],
  ];

  return (
    <dl className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface text-[15px]">
      {rows.map(([term, def]) => (
        <div key={term} className="grid gap-x-4 gap-y-0.5 px-5 py-3 sm:grid-cols-[10rem_1fr]">
          <dt className="font-semibold">{term}</dt>
          <dd className="text-muted">{def}</dd>
        </div>
      ))}
    </dl>
  );
}
