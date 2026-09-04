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

- **The queue** (`lib/queue.ts`): confirming hands out a number from an atomic counter
  (`models/Counter.ts`); numbers are never reused. A listed pass is offered to the first
  `WAVE_SIZE` (10) people, then ten more every `WAVE_MINUTES` (5), until `UNLOCKS_PER_PASS`
  (3) unlocks retire it. Rank is recomputed from *active* members, so the line shortens as
  people are served. Unlocking sets `leftQueueAt` (their turn is spent); a "didn't work"
  report puts them back at the end; three offers ignored reissues the number at the back,
  evaluated when the next pass is listed so it never lands mid-offer. Waves advance lazily
  from `POST /api/waves`, which the open board polls every 30s - wave 1's recipients are the
  ones who turn the clock for the waves behind them. The lifecycle keys on **unlocks, never
  claims**: whether a link was redeemed on claude.ai is invisible to this server.
- **The queue is the only door** (`api/passes/[id]/unlock`): unlocking needs a session *and*
  a number whose wave has opened; a session on its own gets `403 join`, a number too far back
  gets `403 wave`. Confirming the watch link starts the session (`api/watch/confirm`),
  and the alert email's button carries a long-lived `enterToken` (`api/watch/enter`) that
  signs the address in on any device and lands on the board - no sign-in screen between the
  email and the pass. `stopToken` stays separate so a leaked stop link remains harmless.
- **Accounts** (`lib/auth.ts`): Google OAuth or a passwordless email magic link, both
  resolving to one `User` per email address, carried in an HMAC-signed session cookie. The
  `/signin` page is for people who list passes and want the `/manage` dashboard.
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
  MongoDB TTL index. Listing a pass and joining the watch list both sit behind Cloudflare
  Turnstile (`lib/turnstile.ts`, verified server-side) on top of their honeypots; the
  widget's allowed domains include localhost, so development renders and verifies the real
  challenge.
- **Watch list** (`watchers` collection, `lib/watchers.ts`): the first screen of the home
  page is the list, not the board - passes are unlocked within minutes of being listed, so
  the list is how anyone actually gets one. `components/PassListCard.tsx` states the promise
  and the rules above the form and shows only real numbers: how many are waiting (hidden
  under ten, where a small count is a reason to leave), and how fast recent passes went
  (`claimSpeed` in `lib/passes.ts`, the median gap from listing to first unlock over 30
  days, omitted under three data points). A confirmed link lands back on the home page.
  A visitor can leave an email address and be told when passes return. Confirmed opt-in - nothing is
  mailed to an address until a confirmation link is clicked, except for an address that came
  from the visitor's own signed-in session, which was already verified through Google or a
  magic link. Alerts go out per pass in queue order, one wave at a time, never twice about the same
  pass - and anyone alerted within the last wave period is passed over entirely, no second
  mail and no charged offer, so two passes listed together read as one turn, not two.
  Every message carries a one-click stop link (`List-Unsubscribe`, RFC 8058).
  Rows are soft-deleted on stop, so a stop link stays valid and idempotent.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
node --require ./dns-fix.cjs --env-file=.env.local scripts/seed.mjs   # list our own pass
```

`.env.local` keys - `MONGODB_URI` (the `claudecoupons` database), `SENDGRID_API_KEY` (omit and
every email prints to the console instead of sending), `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `IP_HASH_SALT`, `NEXT_PUBLIC_BASE_URL`,
`TURNSTILE_SECRET_KEY` (omit and development waves the captcha through while production
refuses the post - it fails closed on purpose).

The sender address is pinned in `lib/sendgrid.ts` rather than configurable: it has to stay on
`claudecoupons.com`, which is the domain SendGrid signs for, or DKIM alignment breaks and
sign-in links land in spam.

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
