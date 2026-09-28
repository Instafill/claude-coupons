"use client";

import { useEffect, useRef } from "react";

import { type KitCutFilm, filmClip, filmStill, filmUrl } from "@/lib/kitcut";

// One showcased film in the KitCut banner: a few silent seconds of it, looping while the tile is
// on screen and paused when it is not, over its still. The clip (~150 KB) loads only once the tile
// is in view. A reader who asked for less motion sees the still, and the clip only on hover.
// A tap opens the whole film, with sound.
export default function KitCutFilmTile({ film }: { film: KitCutFilm }) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    if (!v || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const seen = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          v.play().catch(() => {
            // autoplay refused (data saver, a browser setting): the still stays up
          });
        } else {
          v.pause();
        }
      },
      { threshold: 0.4 }
    );
    seen.observe(v);
    return () => seen.disconnect();
  }, []);

  const hover = () => {
    video.current?.play().catch(() => {});
  };

  return (
    <a
      href={filmUrl(film, "banner")}
      rel="noopener"
      onMouseEnter={hover}
      className="group/tile block w-[62%] flex-none snap-start text-ink no-underline sm:w-auto"
    >
      <span className="relative block aspect-video overflow-hidden rounded-lg border border-line bg-line shadow-sm transition-shadow group-hover/tile:shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element -- a 640px still already sized for this box */}
        <img
          src={filmStill(film)}
          alt={`${film.kind} for ${film.company}, made with KitCut`}
          width={640}
          height={360}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <video
          ref={video}
          src={filmClip(film)}
          poster={filmStill(film)}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <span className="absolute bottom-1.5 left-1.5 rounded bg-ink/75 px-1.5 py-0.5 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover/tile:opacity-100">
          Watch with sound &#9654;
        </span>
      </span>
      <span className="mt-1.5 block text-[13.5px] leading-tight font-semibold">{film.kind}</span>
      <span className="block text-[12.5px] leading-tight text-muted">{film.company}</span>
    </a>
  );
}
