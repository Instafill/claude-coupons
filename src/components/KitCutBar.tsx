"use client";

import { useEffect, useState } from "react";

import { KITCUT, kitcutUrl } from "@/lib/kitcut";

// A slim bar that slides up from the bottom once the reader has scrolled past the banner at the
// top, so the offer is still in view further down a long board. Closing it hides it for a few
// days in this browser (localStorage); where storage is blocked it simply comes back next visit.
const KEY = "kitcutBarHiddenUntil";
const HIDE_DAYS = 3;
const SHOW_AFTER_PX = 700;

export default function KitCutBar() {
  const [dismissed, setDismissed] = useState(true); // until the browser says otherwise
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let until = 0;
    try {
      until = Number(localStorage.getItem(KEY) || 0);
    } catch {
      // private window, blocked storage: show it
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setDismissed(until > Date.now());
    const onScroll = () => setScrolled(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (dismissed) return null;

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(KEY, String(Date.now() + HIDE_DAYS * 24 * 60 * 60 * 1000));
    } catch {
      // nothing to remember it in; it stays closed for this page view
    }
  };

  return (
    <div
      role="complementary"
      aria-label={KITCUT.label}
      className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] transition-transform duration-300 ${
        scrolled ? "translate-y-0" : "pointer-events-none translate-y-[140%]"
      }`}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border-2 border-accent bg-ink py-2.5 pr-2.5 pl-3 text-white shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element -- a 32px logo; next/image adds nothing here */}
        <img src={KITCUT.logo} alt="" width={32} height={32} className="flex-none rounded-lg" />
        <p className="min-w-0 flex-1 text-[14px] leading-snug">
          <strong>{KITCUT.headline}</strong>{" "}
          <span className="hidden text-white/70 sm:inline">First 30 seconds free.</span>
        </p>
        <a
          href={kitcutUrl("stickybar")}
          rel="noopener"
          className="flex-none rounded-lg bg-accent px-3.5 py-2 text-[14px] font-semibold text-white no-underline hover:bg-accent-dark"
        >
          Try KitCut
        </a>
        <button
          type="button"
          onClick={close}
          aria-label="Hide for a few days"
          className="flex-none cursor-pointer rounded-md px-2 py-1 text-[20px] leading-none text-white/60 hover:text-white"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
