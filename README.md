# ClaudeCoupons.com

A community exchange for referral codes that pay the person claiming them. It started with
[Claude Code and Cowork guest passes](https://support.claude.com/en/articles/13456702-claude-code-and-cowork-guest-passes)
— every Claude Pro/Max subscriber holds a few (7 free days of Claude Pro for someone new to
paid Claude, shared via a personal `claude.ai/referral/{code}` link), and most expire unused.
Anyone can list theirs and anyone can unlock one, behind a signup wall on both sides.

The same machine now runs several boards. Each one is a **deal** in `lib/deals.ts`:

| Deal | Board | What the claimer gets | What the lister gets | Uses |
| --- | --- | --- | --- | --- |
| Claude | `/` | 7 free days of Claude Pro | $10 usage credit if they stay | 3 |
| Waymo | `/waymo-promo-code` | $10 off a first ride | up to $10 off their next ride | 10 |
| Uber | `/uber-promo-code` | 50% off 2 trips, up to $10 each | 50% off 2 trips per rider sent | 10 |
| muse.ai | `/muse-ai-invite-code` | 1B Muse tokens (redeem within 48h) | 1B Muse tokens | 30 |
| Pokémon GO | `/pokemon-go-referral-code` | 100 Poké Balls + milestones | milestone rewards | 10 |
| Fireflies.ai | `/fireflies-ai-referral-code` | 10% off all plans | $5 credit per signup | 10 |
| ChatGPT | `/chatgpt-promo-code` | free months of Plus or Go | nothing — OpenAI pays the sender nothing | 3 |
| Grok | `/grok-promo-code` | nothing yet — a place in line | n/a — waitlist only, no listings taken | 3 |

`/referral-codes` is the hub, with live counts per board.

**ChatGPT is a demand probe.** OpenAI takes no promo code at checkout, but it does issue
personal invite codes — its help centre documents promotional subscription invites, referrals
for Plus and Go, desktop-app referral promotions, and a ChatGPT Free referral campaign that
ran 18 Aug – 17 Sep 2026 in Mexico, India and Indonesia. Those invites have the same shape as
a Claude guest pass, so `/chatgpt-promo-code` is an ordinary board. It ships with nothing on
it, which is the point: signups before a single code has been listed measure whether the
queue itself is the product. Read the signal from the `boards` table in `scripts/stats.mjs`
and from impressions in Google Search Console. `awaitingFirstListing` on the deal keeps the
empty board and the confirmation email from implying codes have been here before; remove it
once one has.

**Grok is a waitlist, not a board.** xAI issues no promo codes and runs no referral program
for Grok: its own billing FAQ never mentions codes, invites, referrals or student pricing, and
every “Grok coupon” in circulation comes from a coupon farm publishing codes for a checkout
with no box to type them in. The nearest real things — X Premium gifting, and xAI's API credits
— are bound to an account and produce nothing anyone could pass on. So `/grok-promo-code` runs
the queue and nothing else: `waitlistOnly` on the deal hides the share cards, drops the board
from the submit form's picker, and makes `submitPass` refuse it server-side, because asking for
a code that demonstrably does not exist would cost the page the trust its copy is built on. It
also omits the `Offer` JSON-LD while the board is empty. Clear the flag the day xAI launches
something — every other field on the deal is already filled for that — and re-read the article
at the same time, because its opening argument is what goes stale first.

**ElevenLabs is deliberately not a board.** Its program is an affiliate link — 22% to the
sharer for 12 months — and nothing in its affiliate guide, terms or partner page gives the
person clicking the link a discount, free month or extra credits. A queue for that would be
a queue for nothing, so `/elevenlabs-promo-code` is an honest article that says so and
points at the free tier. If ElevenLabs ever attaches a discount to referred signups, it
becomes a `Deal` like the rest and gets a board.

Next.js 16 (App Router) + MongoDB via Mongoose, deployed on Vercel.

## Adding a deal

Add an entry to `DEALS` in `lib/deals.ts`, an article to `lib/dealArticles.ts`, and a page
file that renders `<DealPage deal={getDeal("slug")} />`. Nothing else in the codebase names
a brand: the queue, the board, the emails, the submit form and the sitemap all read the
registry. The slug is written onto rows forever, so it is the one field never to change.

The two fields that carry real weight:

- `unlocksPerListing` is how many people a listing is offered to before it retires itself.
  Where the app states a number (Waymo prints ten uses a month, muse.ai counts down from
  thirty) it is that number. Where it states none, it is our own rationing, and the comment
  in the registry says so rather than implying the brand promised it.
- `linkHosts` is the security boundary. A pasted URL is accepted only from those hosts, and
  only the code is kept from it — the link is always rebuilt server-side from
  `linkTemplate`, so an arbitrary link structurally cannot reach the board. `acceptsBareCode`
  is false for Claude on purpose: Anthropic hands out a URL, and requiring the whole URL is
  what keeps a guessed token off that board.

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

- **One queue per board** (`lib/queue.ts`, `models/Membership.ts`): a place in line belongs
  to a board, not to a person — somebody waiting for a Claude pass has not been waiting for
  a Waymo code, and unlocking one must not cost them the other. One `Membership` row per
  (address, deal) holds the number, the offers let go and when they were last mailed;
  Claude's counter is still called `queue` with no suffix so the numbers people are already
  holding keep counting up rather than restarting at 1. Confirming hands out a number from
  an atomic counter (`models/Counter.ts`); numbers are never reused. A listed pass is offered to the first
  `WAVE_SIZE` (10) people, then ten more every `WAVE_MINUTES` (5), until `UNLOCKS_PER_PASS`
  (the deal's own number) unlocks retire it. Rank is recomputed from *active* members, so the line shortens as
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
- **Only codes, never URLs** (`parseDealCode` in `lib/deals.ts`): a pasted URL is accepted
  only from the deal's own `linkHosts`, and only the code is kept from it; the link is
  always reconstructed server-side from `linkTemplate`, so arbitrary links structurally
  cannot enter the board. Bare codes are accepted only for the brands whose share sheet
  hands out a bare code, and only against that brand's shape.
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
node --require ./dns-fix.cjs --env-file=.env.local scripts/migrate-deals.mjs --dry
```

## Migrating an existing database

`scripts/migrate-deals.mjs` tags existing passes and unlocks as `claude`, drops the old
global unique index on `passes.code` (codes are unique per board now, and Mongoose creates
indexes but never drops the ones it no longer declares), and copies every legacy queue place
off the watcher into a `Membership` row — number, offers let go and last-notified time
intact, so nobody loses the place they have been holding. `--dry` reports without writing.

None of it is required for the app to work. Passes with no `deal` read as Claude, and
`ensureQueueAdopted()` in `lib/queue.ts` does the same adoption lazily on the first board
render or wave advance, stamping `queueMigratedAt` so the query that finds the work is the
one that proves there is none left. The script just gets it all done at deploy time instead
of trickling through on live requests.

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
