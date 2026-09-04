"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { turnstileSiteKey } from "@/lib/turnstile";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: { sitekey: string; theme?: "light" | "dark" | "auto" }
      ) => string;
    };
  }
}

// The captcha element. Dropped inside a <form>, it injects a hidden cf-turnstile-response
// input into that form on its own, so the forms here need no token state - FormData picks
// it up and the server verifies it (src/lib/turnstile.ts). Tokens auto-refresh on expiry.
export default function Turnstile() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Starts true when the script already survived a client-side navigation - onLoad alone
  // would leave the second form a visitor reaches without a widget.
  const [ready, setReady] = useState(() => typeof window !== "undefined" && Boolean(window.turnstile));

  useEffect(() => {
    if (!ready || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: turnstileSiteKey(),
      theme: "light",
    });
  }, [ready]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="lazyOnload"
        onLoad={() => setReady(true)}
      />
      {/* Reserves the widget's height so the button below does not jump when it paints. */}
      <div ref={containerRef} style={{ minHeight: 65 }} />
    </>
  );
}
