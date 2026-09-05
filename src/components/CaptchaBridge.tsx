"use client";

import { createContext, useContext, useState } from "react";

import Turnstile from "@/components/Turnstile";

/**
 * Lets the captcha stand somewhere other than inside the form it guards.
 *
 * Turnstile normally injects its proof into the enclosing <form>, which is why every other
 * form here needs no token state at all. On the queue card the widget sits in the left
 * column and the form is in the right one, so there is no enclosing form to inject into and
 * the token has to be carried across instead.
 *
 * The provider is a client component wrapping children rendered on the server, which is
 * what lets a server component keep owning the layout while these two talk to each other.
 */
const CaptchaContext = createContext<{
  token: string | null;
  setToken: (token: string | null) => void;
} | null>(null);

export function CaptchaBridge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  return (
    <CaptchaContext.Provider value={{ token, setToken }}>
      <div className={className}>{children}</div>
    </CaptchaContext.Provider>
  );
}

/** Where the widget actually draws. Put it wherever it belongs on the page. */
export function CaptchaSlot() {
  const bridge = useContext(CaptchaContext);
  if (!bridge) return null;
  return <Turnstile onToken={bridge.setToken} />;
}

/**
 * The token, for the form to submit. Null outside a bridge, which is how a form knows to
 * render its own widget the ordinary way instead.
 */
export function useCaptchaToken(): { bridged: boolean; token: string | null } {
  const bridge = useContext(CaptchaContext);
  return { bridged: Boolean(bridge), token: bridge?.token ?? null };
}
