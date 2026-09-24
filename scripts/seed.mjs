// Lists a referral code on one board, so that board is never empty. Idempotent per board.
//
// The code is never hardcoded: it is a live referral code that anyone reading this file could
// otherwise spend. It is also never trusted - it goes through parseDealCode, the same boundary
// and the same case-normalization a submission through the form goes through, so a row written
// here is indistinguishable from a row someone listed, and a typo is an error rather than a
// dead code handed to a real person.
//
//   SEED_DEAL=waymo SEED_CODE=RIDER5ABCD SEED_EMAIL=you@example.com \
//     node --experimental-strip-types --require ./dns-fix.cjs --env-file=.env.local \
//     scripts/seed.mjs --dry
//
// SEED_CODE takes a bare code or a full share link - whatever the app gave you.
import mongoose from "mongoose";

const dry = process.argv.includes("--dry");

// The registry is TypeScript, and duplicating any of it here is how the two drift. It has no
// imports and no path aliases, so type stripping is enough to read it directly.
let deals;
try {
  deals = await import("../src/lib/deals.ts");
} catch (err) {
  console.error(
    "Could not load src/lib/deals.ts. Run node with --experimental-strip-types (Node 22), " +
      "or on Node 23+ where stripping is on by default.\n" + err.message
  );
  process.exit(1);
}
const { getDeal, isDealSlug, parseDealCode, dealLink } = deals;

const uri = process.env.MONGODB_URI;
const slug = process.env.SEED_DEAL;
const raw = process.env.SEED_CODE;
const email = process.env.SEED_EMAIL?.toLowerCase();

if (!uri || !slug || !raw || !email) {
  console.error("Set MONGODB_URI, SEED_DEAL, SEED_CODE and SEED_EMAIL to seed a board.");
  process.exit(1);
}
if (!isDealSlug(slug)) {
  console.error(`Unknown board "${slug}".`);
  process.exit(1);
}

const deal = getDeal(slug);
// The same refusal submitPass makes. A board nobody can list on cannot be seeded either.
if (deal.waitlistOnly) {
  console.error(`The ${deal.name} board takes no listings - there is nothing to seed it with.`);
  process.exit(1);
}

const code = parseDealCode(deal, raw);
if (!code) {
  console.error(
    `That is not a ${deal.name} ${deal.noun}. It should look like ${
      deal.linkTemplate ? deal.linkTemplate.replace("{code}", deal.codeExample) : deal.codeExample
    }.`
  );
  process.exit(1);
}

console.log(`board:  ${deal.name} (${deal.path})`);
console.log(`code:   ${code}`);
console.log(`shows:  ${dealLink(deal, code) || deal.redeemUrl}`);
console.log(`uses:   ${deal.unlocksPerListing}`);
console.log(`lister: ${email}`);
if (dry) {
  console.log("\n--dry: nothing written.");
  process.exit(0);
}

await mongoose.connect(uri);
const db = mongoose.connection.db;
console.log("\nconnected to db:", db.databaseName);

const users = db.collection("users");
const passes = db.collection("passes");

// Codes are unique per board, never globally - see the comment in src/models/Pass.ts. Creating
// the old global index here is how the boards migration gets silently undone.
// listIndexes throws NamespaceNotFound on a database where nothing has been listed yet, which
// is exactly the case this script exists for.
const existing = await passes.indexes().catch(() => []);
const stale = existing.find((index) => index.name === "code_1");
if (stale) {
  console.warn(
    "WARNING: the old global unique index on passes.code is still present. Two boards cannot " +
      "mint the same code while it exists. Run scripts/migrate-deals.mjs to drop it."
  );
}
await users.createIndex({ email: 1 }, { unique: true });
await passes.createIndex({ deal: 1, code: 1 }, { unique: true });
await db.collection("unlocks").createIndex({ passId: 1, userId: 1 }, { unique: true });

const now = new Date();
await users.updateOne(
  { email },
  { $setOnInsert: { email, createdAt: now, updatedAt: now } },
  { upsert: true }
);
const user = await users.findOne({ email });

// Written field by field because the raw driver applies none of the schema defaults in
// models/Pass.ts - a row missing waveStartedAt breaks openWaveCount on the board.
const res = await passes.updateOne(
  { deal: deal.slug, code },
  {
    $setOnInsert: {
      deal: deal.slug,
      code,
      submitterUserId: user._id,
      status: "live",
      lastRefreshedAt: now,
      waveStartedAt: now,
      wavesNotified: 0,
      waveCursor: 0,
      unlockCount: 0,
      claimedCount: 0,
      deadCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  },
  { upsert: true }
);
console.log(
  res.upsertedCount
    ? `seeded ${code} on the ${deal.name} board`
    : `${code} is already listed on the ${deal.name} board`
);
await mongoose.disconnect();
