# ClaudeCoupons.com

A community exchange for [Claude Code and Cowork guest passes](https://support.claude.com/en/articles/13456702-claude-code-and-cowork-guest-passes).
Every Claude Pro/Max subscriber holds a few guest passes (7 free days of Claude Pro for someone
new to paid Claude, shared via a personal `claude.ai/referral/{code}` link). Most expire unused.
Here anyone can list their link and anyone can unlock one — behind a signup wall on both sides.

Next.js 16 (App Router) + MongoDB via Mongoose, deployed on Vercel.

## Why there is no automatic validity check

Verified 2026-08-26/27:

- `GET claude.ai/referral/{code}` returns the identical static SPA shell (HTTP 200,
  Cloudflare-cached) for real and garbage codes alike. The `/login` redirect people see is
  client-side JS. Pinging tells you nothing.
- The SPA resolves codes via `GET claude.ai/api/referral/code/{code}`, but claude.ai sits behind
  Cloudflare bot management: plain clients get 403, headless browsers get funneled into a
  challenge. Fighting that is fragile and against Anthropic's ToS.
- CORS/CSP close the visitor's-browser loophole too: no `Access-Control-Allow-Origin` on the API
  (opaque responses only) and `frame-ancestors 'self'` blocks iframing.
- "Redeemed" isn't even a property of the URL: one link covers the sender's whole pass
  allotment, and the remaining count is visible only in the sender's own `/passes` UI.

So the *human who just tried the link* is the validity checker. `components/Board.tsx` opens the
pass in a new tab; on return (`visibilitychange`) it asks "Did it work?" and the one-click answer
drives the lifecycle.

## How it works

- **Signup wall, both sides** (`lib/auth.ts`): Google OAuth or a passwordless email magic link,
  both resolving to one `User` per email address, carried in an HMAC-signed session cookie.
  Listing a pass requires an account; unlocking a pass link requires an account.
- **Unlock log** (`models/Unlock.ts`): one row per (pass, user) with time, salted IP hash and the
  reported outcome — so there is an answer to "who unlocked this coupon, and did they get it".
  Submitters see per-listing unlock/claim/dead counts on `/manage`.
- **Only codes, never URLs**: submissions are parsed against
  `^(https://claude\.ai/referral/)?[A-Za-z0-9]{6,20}$`; the URL is always reconstructed
  server-side, so arbitrary links structurally cannot enter the board.
- **Lifecycle** (`lib/passes.ts`, evaluated lazily on read — no cron): a listing hides after 3
  reported claims (a sender's whole allotment), after 2 "didn't work" reports exceeding claims,
  or 21 days after its last refresh. Submitters can refresh / mark exhausted / remove.
- **Anti-abuse**: unlocking is capped at 3 passes per account per rolling 24h; the sign-in form
  carries a honeypot field; magic-link tokens are single-use and expire in 30 minutes via a
  MongoDB TTL index.
- **Watch list** (`watchers` collection, `lib/watchers.ts`): when the board is empty a visitor
  can leave an email address and be told when passes return. Confirmed opt-in - nothing is
  mailed to an address until a confirmation link is clicked, except for an address that came
  from the visitor's own signed-in session, which was already verified through Google or a
  magic link. The alert fires only on the empty-to-not-empty transition, with a 12h floor per
  address, and every message carries a one-click stop link (`List-Unsubscribe`, RFC 8058).
  Rows are soft-deleted on stop, so a stop link stays valid and idempotent.

## Coupon marketplace

Beyond the pass board, any software product can have a page at `/coupons/{slug}` (hub at
`/coupons`). The mechanic is a threshold-gated drop:

- **Page states**, derived on read (`lib/products.ts`): *Wanted* (nobody from the product
  has claimed it; the hero says "Not an official page"), *Armed* (claimed), *Live* (a drop
  has codes left), *Sold out*, and *Archived* (the admin kill switch: 404, out of the
  sitemap).
- **Disclosed scarcity.** The drop contract sits above the email box: how many codes, how
  many people, how winners are chosen, what happens if you miss. Every number on the page
  is a counter on the `products` row; there is no constant anywhere in the rendering path.
- **Subscribers** (`lib/subscribers.ts`, `models/Subscriber.ts`) follow the watcher
  pattern: confirmed opt-in with a 7-day single-use token, a signed-in address is
  pre-verified, per-IP throttles, disposable domains refused, consent sentence and time
  stored on the row. Confirmation hands out a place in line from an atomic counter.
- **Goal** = `baseline + threshold`. Reaching it opens a *pending* drop and emails the
  owner (or the operator for an unclaimed page). Nothing is sent to the list until a person
  presses Release on `/founders/{slug}`.
- **Release** (`lib/drops.ts`) attaches every pooled code to the drop and emails the list,
  500 per press, marking only delivered rows; pressing again continues and never re-mails.
- **Claims** (`lib/coupons.ts`) are single-document atomics: one `findOneAndUpdate` on
  `remaining > 0`, and the unique index on `(dropId, subscriberId)` is the one-code-per-
  person rule. Identity for a claim is the token in the email link (kept in localStorage)
  or the session; never a typed address.
- **Ownership** (`lib/ownership.ts`): a sign-in address on the product's own domain claims
  the page on the spot; anything else waits for the admin on `/admin`.
- **Founders see aggregates** and masked addresses only. We do the sending.

Seed pages for products whose makers haven't joined:

```bash
node --require ./dns-fix.cjs --env-file=.env.local scripts/import-products.mjs data/products.json
```

Entries need `name`, `websiteUrl`, `tagline` and a `description` of at least 60 words;
thinner pages are refused. The script also creates every unique index.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
node --require ./dns-fix.cjs --env-file=.env.local scripts/seed.mjs   # list our own pass
```

`.env.local` keys - `MONGODB_URI` (the `claudecoupons` database), `SENDGRID_API_KEY` (omit and
every email prints to the console instead of sending), `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `IP_HASH_SALT`, `NEXT_PUBLIC_BASE_URL`,
`ADMIN_EMAILS` (comma-separated; unlocks `/admin` and lets those accounts manage every
product page), `MAIL_POSTAL_ADDRESS` (printed at the foot of bulk mail, CAN-SPAM),
`NEXT_PUBLIC_SITE_URL` (the canonical origin - see below; defaults to
`https://claudecoupons.com`).

The sender address is derived from the site's own domain in `lib/sendgrid.ts` rather than
configured separately: a sender on one domain and a site on another is the shape of a
phishing mail, filters score it that way, and DKIM alignment breaks unless the sending
domain is the one SendGrid signs for.

## Moving to a new domain

Everything that names the site - canonicals, the sitemap, `robots.txt`, JSON-LD, absolute
links in email, and the address mail is sent from - derives from `SITE_URL` in
`lib/seo.ts`, which reads `NEXT_PUBLIC_SITE_URL`. Moving is one variable, in this order:

1. **Verify the new domain in SendGrid** (domain authentication; publish its DKIM and SPF
   records). The sender becomes `hello@{new host}` automatically, so doing this second
   would bury the sign-in mail.
2. Point the domain at Vercel and set `NEXT_PUBLIC_SITE_URL=https://newdomain.com` (no
   trailing slash). Set `NEXT_PUBLIC_BASE_URL` to the same value, or leave it unset and it
   falls back to `SITE_URL`.
3. Route `hello@{new host}` to a real inbox (Cloudflare Email Routing does this today), so
   replies to drop and sign-in mail land somewhere.
4. Redirect the old domain and resubmit `sitemap.xml`. Links already sent - confirmation,
   stop and claim links - carry the old origin, so keep the redirect for as long as those
   can still be clicked.

The visible brand ("ClaudeCoupons.com" in the header and footer) is deliberately *not*
derived from the domain: renaming is a separate decision from moving.

`dns-fix.cjs` exists because Node 24's c-ares resolver defaults to 127.0.0.1 when it can't detect
system DNS, which breaks the `mongodb+srv` lookup.

## Deployment

Deployed on Vercel from `Instafill/claude-coupons` - a push to `main` deploys to
production. Live at https://claude-coupons.vercel.app until `claudecoupons.com` DNS points
at Vercel.

## Google OAuth

Authorized redirect URIs must include `http://localhost:3000/api/auth/callback` and
`https://claudecoupons.com/api/auth/callback` (plus the Vercel preview domain if you sign in
there).
