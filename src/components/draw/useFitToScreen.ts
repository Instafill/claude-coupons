"use client";
import { useEffect, type RefObject } from "react";

/**
 * On a desktop, sizes an element to run from wherever it sits down to the bottom edge of the
 * screen (12 px clear), so what is at its bottom (the chat's newest line, its input) is always
 * in view: below the header before the page scrolls, the full height once it sticks.
 *
 * Re-fits on scroll and resize, and also whenever anything else on the page changes size (a
 * banner's images loading, a join panel opening above it): without that the element kept its
 * old height and its bottom slid under the fold.
 */
export function useFitToScreen(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wide = window.matchMedia("(min-width: 1024px)");
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!wide.matches) {
          el.style.height = "";
          return;
        }
        const top = Math.max(el.getBoundingClientRect().top, 12);
        const height = `${Math.max(window.innerHeight - top - 12, 360)}px`;
        if (el.style.height !== height) el.style.height = height;
      });
    };
    fit();
    window.addEventListener("scroll", fit, { passive: true });
    window.addEventListener("resize", fit);
    wide.addEventListener("change", fit);
    const page = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    page?.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      page?.disconnect();
      window.removeEventListener("scroll", fit);
      window.removeEventListener("resize", fit);
      wide.removeEventListener("change", fit);
    };
  }, [ref]);
}
