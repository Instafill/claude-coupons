// Domain helpers for two decisions: whether a sign-in address belongs to the product it is
// claiming, and whether a subscriber's address is a throwaway that would only bounce.

// Suffixes where the registrable name is three labels deep. Short on purpose: the domain
// match is a convenience for auto-approval, and anything it misses lands with the admin.
const TWO_LEVEL_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "com.au",
  "net.au",
  "co.jp",
  "co.nz",
  "com.br",
  "co.in",
  "co.za",
  "com.mx",
  "com.sg",
]);

// Addresses on these can never prove they run a product.
export const FREEMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "mail.com",
  "yandex.com",
  "zoho.com",
  "fastmail.com",
  "hey.com",
]);

// Throwaway inboxes. Coupon hunters lean on these, and every one is a bounce or a spam
// trap waiting to dent the domain reputation the sign-in mail depends on.
export const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "dispostable.com",
  "maildrop.cc",
  "sharklasers.com",
  "mohmal.com",
  "fakeinbox.com",
  "mailnesia.com",
  "tempr.email",
  "emailondeck.com",
  "burnermail.io",
]);

export function registrableDomain(host: string): string {
  const labels = host.toLowerCase().replace(/\.$/, "").split(".");
  if (labels.length <= 2) return labels.join(".");
  const lastTwo = labels.slice(-2).join(".");
  return TWO_LEVEL_SUFFIXES.has(lastTwo) ? labels.slice(-3).join(".") : lastTwo;
}

/** The registrable domain of an https URL, or null when the URL is not usable. */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!host.includes(".")) return null;
    return registrableDomain(host);
  } catch {
    return null;
  }
}

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

export function isDisposable(email: string): boolean {
  return DISPOSABLE_DOMAINS.has(emailDomain(email));
}

export function isFreemail(email: string): boolean {
  return FREEMAIL_DOMAINS.has(emailDomain(email));
}
