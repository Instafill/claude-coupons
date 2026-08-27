# ClaudeCoupons.com

A community exchange for [Claude Code and Cowork guest passes](https://support.claude.com/en/articles/13456702-claude-code-and-cowork-guest-passes).
Every Claude Pro/Max subscriber holds a few guest passes (7 free days of Claude Pro for someone
new to paid Claude, shared via a personal `claude.ai/referral/{code}` link). Most expire unused.
Here anyone can list their link and anyone can unlock one — behind a signup wall on both sides.

Next.js 16 (App Router) + MongoDB via Mongoose, deployed on Vercel. Same stack and conventions
as `C:\appmakers\sprinkles`.

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

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
node --require ./dns-fix.cjs --env-file=.env.local scripts/seed.mjs   # list our own pass
```

`.env.local` keys — `MONGODB_URI` (the `claudecoupons` database), `SENDGRID_API_KEY` (omit and
magic links print to the console instead of sending), `EMAIL_FROM`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `IP_HASH_SALT`, `NEXT_PUBLIC_BASE_URL`.

`dns-fix.cjs` exists because Node 24's c-ares resolver defaults to 127.0.0.1 when it can't detect
system DNS, which breaks the `mongodb+srv` lookup.

## Google OAuth

Authorized redirect URIs must include `http://localhost:3000/api/auth/callback` and
`https://claudecoupons.com/api/auth/callback` (plus the Vercel preview domain if you sign in
there).
