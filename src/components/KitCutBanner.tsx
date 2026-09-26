import Image from "next/image";

import { KITCUT, kitcutUrl } from "@/lib/kitcut";

// The KitCut banner at the top of every page (the layout places it between the header and the
// page). Deliberately loud - a full-width card with film stills and a filled button - because
// KitCut needs its first users; it names itself as our own product so nobody mistakes it for a
// pass. The whole card is one link, so a tap anywhere on it counts.
export default function KitCutBanner() {
  return (
    <aside aria-label={KITCUT.label} className="mx-auto mb-7 max-w-5xl px-5">
      <a
        href={kitcutUrl("banner")}
        rel="noopener"
        className="group flex flex-col overflow-hidden rounded-2xl border-2 border-accent bg-surface text-ink no-underline shadow-sm transition-shadow hover:shadow-md sm:flex-row"
      >
        <Image
          src={KITCUT.image}
          alt={KITCUT.imageAlt}
          width={640}
          height={335}
          priority
          className="h-auto w-full object-cover sm:w-[300px] sm:flex-none"
        />
        <div className="flex flex-1 flex-col justify-center gap-2 p-5">
          <p className="flex items-center gap-2 text-[12px] font-semibold tracking-wider text-accent-dark uppercase">
            <Image src={KITCUT.logo} alt="" width={18} height={18} className="rounded" />
            {KITCUT.label} &middot; kitcut.ai
          </p>
          <p className="text-[21px] leading-snug font-bold">{KITCUT.headline}</p>
          <p className="text-[14.5px] text-muted">
            {KITCUT.pitch} <strong className="text-ink">{KITCUT.free}</strong>
          </p>
          <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[15px] font-semibold text-white transition-colors group-hover:bg-accent-dark">
            {KITCUT.cta} <span aria-hidden="true">&rarr;</span>
          </span>
        </div>
      </a>
    </aside>
  );
}
