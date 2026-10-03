import Image from "next/image";

import KitCutFilmTile from "@/components/KitCutFilmTile";
import { KITCUT, KITCUT_FILMS, kitcutUrl } from "@/lib/kitcut";

// The KitCut banner at the top of every page (the layout places it between the header and the
// page). Deliberately loud, because KitCut needs its first users, and it names itself as our own
// product so nobody mistakes it for a pass. It sells by showing: four films KitCut made,
// playing silently in their tiles, beside the pitch and a filled button. On a phone the films
// become a row you swipe, so the banner does not push the board a screen down.
export default function KitCutBanner() {
  return (
    <aside aria-label={KITCUT.label} className="mx-auto mb-7 max-w-5xl px-5">
      <div className="rounded-2xl border-2 border-accent bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-1.5">
            <p className="flex items-center gap-2 text-[12px] font-semibold tracking-wider text-accent-dark uppercase">
              <Image src={KITCUT.logo} alt="" width={18} height={18} className="rounded" />
              {KITCUT.label} &middot; kitcut.ai
            </p>
            <p className="text-[21px] leading-snug font-bold text-ink">{KITCUT.headline}</p>
            <p className="text-[14.5px] text-muted">
              <span className="hidden sm:inline">{KITCUT.pitch} </span>
              <strong className="text-ink">{KITCUT.uses}</strong>
            </p>
          </div>
          <a
            href={kitcutUrl("banner")}
            rel="noopener"
            className="inline-flex w-fit flex-none items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[15px] font-semibold text-white no-underline transition-colors hover:bg-accent-dark"
          >
            {KITCUT.cta} <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
        <p className="mt-4 mb-2 text-[12px] font-semibold tracking-wider text-muted uppercase">Made on KitCut</p>
        <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0">
          {KITCUT_FILMS.map((f) => (
            <KitCutFilmTile key={f.slug} film={f} />
          ))}
        </div>
      </div>
    </aside>
  );
}
