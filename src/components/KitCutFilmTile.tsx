"use client";

import { useRef } from "react";

import { type KitCutFilm, filmPreview, filmStill, filmUrl } from "@/lib/kitcut";

// One showcased film in the KitCut banner: its still, and on hover the film itself, muted, from
// the same moment. The video loads nothing until the pointer arrives (preload="none"), so a page
// full of readers who never hover costs four small JPEGs. A tap opens the film on kitcut.ai.
export default function KitCutFilmTile({ film }: { film: KitCutFilm }) {
  const video = useRef<HTMLVideoElement>(null);

  const play = () => {
    const v = video.current;
    if (!v) return;
    v.play().catch(() => {
      // autoplay refused or the file is unreachable: the still stays up
    });
  };
  const stop = () => video.current?.pause();

  return (
    <a
      href={filmUrl(film, "banner")}
      rel="noopener"
      onMouseEnter={play}
      onMouseLeave={stop}
      onFocus={play}
      onBlur={stop}
      className="group/tile block w-[62%] flex-none snap-start text-ink no-underline sm:w-auto"
    >
      <span className="relative block aspect-video overflow-hidden rounded-lg border border-line bg-line">
        {/* eslint-disable-next-line @next/next/no-img-element -- a 640px still already sized for this box */}
        <img
          src={filmStill(film)}
          alt={`${film.kind}: ${film.what}. A still from a KitCut film.`}
          width={640}
          height={360}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <video
          ref={video}
          src={filmPreview(film)}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover/tile:opacity-100 group-focus/tile:opacity-100"
        />
        <span className="absolute right-1.5 bottom-1.5 rounded bg-ink/80 px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">
          {film.length}
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-0 m-auto flex h-10 w-10 items-center justify-center rounded-full bg-ink/70 pl-0.5 text-[15px] text-white transition-opacity group-hover/tile:opacity-0"
        >
          &#9654;
        </span>
      </span>
      <span className="mt-1.5 block text-[13px] leading-tight font-semibold">{film.kind}</span>
      <span className="block text-[12.5px] leading-tight text-muted">{film.what}</span>
    </a>
  );
}
