// The sponsorship on sale at /sponsor: the slots KitCut fills today (src/lib/kitcut.ts), sold to
// one company at a time for $500 a month, paid through KitCut's Stripe account (the owner's call,
// 2026-11-01). A paying sponsor is swapped in by hand, in kitcut.ts's words and pictures.
//
// The traffic below is a snapshot of Vercel Web Analytics (production, bots excluded), taken
// 2026-11-01: the site has no Vercel token at runtime, so the page cannot read it live. Re-take
// it with Builders HQ `site_traffic` (source vercel, site claudecoupons.com) and paste it here.

export const SPONSOR_PRICE_USD = 500;

// A Stripe Payment Link for the "ClaudeCoupons.com sponsorship" product ($500/month) on KitCut's
// account (plink_1UXCAYA5T9Z7Ve5ewkYX45Ky). It sends the buyer back to /sponsor?thanks=1.
// Empty: the button writes an email instead.
export const SPONSOR_CHECKOUT_URL = "https://buy.stripe.com/3cI5kC7UL1DA0kUeF34wM09";

export const SPONSOR_EMAIL = "hello@claudecoupons.com";

export const TRAFFIC = {
  takenOn: "2026-11-01",
  last30: { visitors: 7486, pageviews: 15808, desktopShare: 0.8 },
  last61: { visitors: 12005, pageviews: 26149 },
  // the top countries over the last 30 days, by visitors
  countries: [
    { code: "US", name: "United States", visitors: 2256 },
    { code: "SG", name: "Singapore", visitors: 1705 },
    { code: "BR", name: "Brazil", visitors: 280 },
    { code: "IN", name: "India", visitors: 273 },
    { code: "ID", name: "Indonesia", visitors: 269 },
    { code: "DE", name: "Germany", visitors: 234 },
    { code: "VN", name: "Vietnam", visitors: 139 },
    { code: "PL", name: "Poland", visitors: 136 },
    { code: "GB", name: "United Kingdom", visitors: 127 },
    { code: "CA", name: "Canada", visitors: 115 },
  ],
  // visitors per day, 2026-09-02 to 2026-11-01
  daily: [
    120, 97, 161, 87, 80, 90, 73, 89, 74, 95, 85, 54, 79, 81, 100, 107, 83, 63, 80, 121, 210, 220, 263, 243,
    248, 243, 336, 345, 225, 277, 297, 239, 227, 194, 190, 219, 198, 162, 234, 301, 205, 212, 212, 276, 245,
    268, 305, 329, 356, 310, 292, 309, 181, 224, 215, 216, 286, 263, 275, 336, 381,
  ],
  dailyFrom: "2026-09-02",
};
