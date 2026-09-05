"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { turnstileSiteKey } from "@/lib/turnstile";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
    };
  }
}

// The captcha element. Dropped inside a <form>, it injects a hidden cf-turnstile-response
// input into that form on its own, so the forms here need no token state - FormData picks
// it up and the server verifies it (src/lib/turnstile.ts). Tokens auto-refresh on expiry.
//
// `onToken` is for the one case that injection cannot serve: a widget sitting outside the
// form it guards, where there is no enclosing form to inject into. The caller then carries
// the token itself. It is told when the token expires or errors too - a stale token fails
// verification, and a form that still holds one would submit a proof the server rejects.
export default function Turnstile({ onToken }: { onToken?: (token: string | null) => void }) {
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
      ...(onToken
        ? {
            callback: (token: string) => onToken(token),
            "expired-callback": () => onToken(null),
            "error-callback": () => onToken(null),
          }
        : {}),
    });
    // Deliberately not re-running on a changed onToken: re-rendering the widget would
    // throw away a solved challenge and make the visitor do it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
