# ClaudeCoupons.com

A community exchange for [Claude Code and Cowork guest passes](https://support.claude.com/en/articles/13456702-claude-code-and-cowork-guest-passes).
Every Claude Pro/Max subscriber holds a few guest passes (7 free days of Claude Pro for someone
new to paid Claude, shared via a personal `claude.ai/referral/{code}` link). Most expire unused.
Here anyone can list their link and anyone can unlock one - behind a signup wall on both sides.

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

So the *human who just tried the link* is the validity checker. The claim flow opens the pass in
a new tab; on return (`visibilitychange`) the board asks "Did it work?" and the one-click answer
drives the lifecycle.

## How it works

- **Signup wall, both sides**: passwordless magic-link email sign-in (no passwords stored).
  Submitting requires an account; unlocking a pass link requires an account. Every unlock is
  logged (`unlocks` collection: pass, user, time, ip-hash, reported outcome) - so there is an
  answer to "who unlocked this coupon and did they receive it".
- **Only codes, never URLs**: submissions are parsed against
  `^(https://claude\.ai/referral/)?[A-Za-z0-9]{6,20}$`; the URL is always reconstructed
  server-side, so arbitrary links structurally cannot enter the board.
- **Lifecycle** (`BL/PassStore.cs`): a listing hides after 3 reported claims (a sender's whole
  allotment), after 2 "didn't work" reports exceeding claims, or 21 days after its last
  refresh. Submitters can refresh / mark exhausted / remove from `/manage`, which also shows
  their per-listing unlock/claim/dead counts.
- **Anti-hoarding**: unlocking is capped at 3 passes per account per rolling 24h; write
  endpoints are rate-limited per IP; the sign-in form carries a honeypot field.

## Stack

ASP.NET Core MVC (net10.0) + MongoDB. No auth framework - cookie auth plus one-time login
tokens in Mongo. Email via raw SendGrid `mail/send`; with no `SendGrid:ApiKey` configured the
magic link is written to the log instead (that is the development mode).

## Run locally

```bash
# needs a local mongod (or point Mongo:ConnectionString at Atlas)
cd ClaudeCoupons
dotnet run
# sign-in links appear in the console output
```

Config keys: `Mongo:ConnectionString`, `Mongo:Database`, `SendGrid:ApiKey`, `Email:From`,
`IpHashSalt` (set a real secret in production), `Seed:Code`/`Seed:Email` (idempotent first-run
listing so the board is never empty).
