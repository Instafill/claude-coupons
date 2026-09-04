// Cloudflare Turnstile, on the two doors bots actually push on: listing a pass and
// joining the watch list. The widget rides inside the form and drops its proof into a
// hidden cf-turnstile-response field; the server swaps that proof for a yes/no here.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Public by design - it is in the page source of every form. The widget's allowed
// domains include localhost alongside claudecoupons.com, so development renders the
// real challenge and .env.local's secret verifies it for real: the tested path is the
// deployed path.
const SITE_KEY = "0x4AAAAAAEmpsAEDaQ-KJe3j";

// The field name Turnstile injects into the enclosing form on its own.
export const TURNSTILE_FIELD = "cf-turnstile-response";

export function turnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || SITE_KEY;
}

// True when the token proves a real visitor sat in front of the form. Without a secret
// configured, development passes everything and production fails closed - a deploy that
// loses the key should refuse bots, not admit them silently.
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV !== "production") return true;
    console.error("TURNSTILE_SECRET_KEY is not set; refusing the form post");
    return false;
  }
  if (!token.trim()) return false;

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }).toString(),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as { success: boolean };
    return Boolean(result.success);
  } catch {
    // Cloudflare being unreachable is our outage, not the visitor's fault - but letting
    // everything through during one would defeat the gate. Fail closed; the form says
    // "try again" and the next attempt usually lands.
    return false;
  }
}
