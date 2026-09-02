import type { PageState } from "@/lib/product-state";

// The four public states, named the same way everywhere the page mentions them.
const LABEL: Record<PageState, { text: string; className: string }> = {
  wanted: { text: "Unofficial page - founders haven't joined", className: "bg-[#f0ede6] text-muted" },
  armed: { text: "Claimed by the makers", className: "bg-[#e2f2e9] text-good" },
  live: { text: "Drop live now", className: "bg-accent text-white" },
  sold_out: { text: "Last drop sold out", className: "bg-[#f9e5e0] text-bad" },
};

export default function StateBadge({ state }: { state: PageState }) {
  const { text, className } = LABEL[state];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${className}`}>
      {text}
    </span>
  );
}
