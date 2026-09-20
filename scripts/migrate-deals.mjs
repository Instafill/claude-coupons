// Brings an existing claudecoupons database up to the multi-board schema.
//
// Everything here is idempotent and safe to re-run. The app does not depend on it having
// run - passes with no `deal` field read as Claude, and lib/queue.ts adopts legacy queue
// places lazily on the first wave advance or board render. What this script does is get all
// of that done at once, at deploy time, instead of trickling through on live requests, and
// drop the one index Mongoose cannot drop for itself.
//
//   node --require ./dns-fix.cjs --env-file=.env.local scripts/migrate-deals.mjs
//
// Pass --dry to see what it would do without writing.

import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
const dry = process.argv.includes("--dry");

if (!uri) {
  console.error("Set MONGODB_URI to migrate.");
  process.exit(1);
}

await mongoose.connect(uri);
const db = mongoose.connection.db;
console.log(`connected to ${db.databaseName}${dry ? " (dry run)" : ""}`);

const passes = db.collection("passes");
const unlocks = db.collection("unlocks");
const watchers = db.collection("watchers");
const memberships = db.collection("memberships");

// 1. Every row that predates the field is a Claude row - that is all there was.
const passesToTag = await passes.countDocuments({ deal: { $exists: false } });
const unlocksToTag = await unlocks.countDocuments({ deal: { $exists: false } });
console.log(`passes without a deal: ${passesToTag}`);
console.log(`unlocks without a deal: ${unlocksToTag}`);
if (!dry) {
  await passes.updateMany({ deal: { $exists: false } }, { $set: { deal: "claude" } });
  await unlocks.updateMany({ deal: { $exists: false } }, { $set: { deal: "claude" } });
}

// 2. Codes are unique per board now, not globally. Mongoose creates the indexes it declares
//    but never removes the ones it no longer does, so the old global unique index on `code`
//    would otherwise keep refusing a Muse code that happens to match a Pokémon GO one.
const indexes = await passes.indexes();
const stale = indexes.find((index) => index.name === "code_1");
if (stale) {
  console.log("dropping the old global unique index on passes.code");
  if (!dry) await passes.dropIndex("code_1");
} else {
  console.log("no global unique index on passes.code (already dropped)");
}
if (!dry) {
  await passes.createIndex({ deal: 1, code: 1 }, { unique: true });
  await memberships.createIndex({ email: 1, deal: 1 }, { unique: true });
  await memberships.createIndex({ deal: 1, stoppedAt: 1, leftQueueAt: 1, position: 1 });
}

// 3. The queue moves off the watcher and into its own collection, one row per board. Places
//    are copied across exactly - number, offers let go, when they were last mailed - because
//    the number someone has been holding is the whole product.
const legacy = await watchers
  .find({
    confirmedAt: { $exists: true },
    stoppedAt: { $exists: false },
    queueMigratedAt: { $exists: false },
  })
  .sort({ confirmedAt: 1 })
  .toArray();
console.log(`watchers to adopt into the Claude queue: ${legacy.length}`);

let copied = 0;
let numbered = 0;
for (const watcher of legacy) {
  const existing = await memberships.findOne({ email: watcher.email, deal: "claude" });
  if (!existing) {
    if (watcher.position) {
      copied += 1;
      if (!dry) {
        await memberships.insertOne({
          watcherId: watcher._id,
          email: watcher.email,
          deal: "claude",
          position: watcher.position,
          ...(watcher.leftQueueAt ? { leftQueueAt: watcher.leftQueueAt } : {}),
          offersSinceUnlock: watcher.offersSinceUnlock ?? 0,
          ...(watcher.lastNotifiedAt ? { lastNotifiedAt: watcher.lastNotifiedAt } : {}),
          notifyCount: watcher.notifyCount ?? 0,
          createdAt: watcher.confirmedAt ?? new Date(),
          updatedAt: new Date(),
        });
      }
    } else {
      // Confirmed before the queue existed, so they hold no number at all. They are adopted
      // in the order they confirmed, which is the order they joined the line.
      numbered += 1;
      if (!dry) {
        const counter = await db.collection("counters").findOneAndUpdate(
          { _id: "queue" },
          { $inc: { value: 1 } },
          { upsert: true, returnDocument: "after" }
        );
        await memberships.insertOne({
          watcherId: watcher._id,
          email: watcher.email,
          deal: "claude",
          position: (counter.value ?? counter?.value) || 1,
          offersSinceUnlock: 0,
          notifyCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }
  if (!dry) {
    await watchers.updateOne(
      { _id: watcher._id },
      { $set: { queueMigratedAt: new Date() } }
    );
  }
}

// 4. Someone who stopped keeps their row, and their memberships have to agree with it -
//    otherwise a stopped address is still in a line, counted in its arithmetic and charged
//    an offer every time a wave walks past it.
const stopped = await watchers.find({ stoppedAt: { $exists: true } }).toArray();
let silenced = 0;
for (const watcher of stopped) {
  const result = dry
    ? await memberships.countDocuments({ email: watcher.email, stoppedAt: { $exists: false } })
    : (
        await memberships.updateMany(
          { email: watcher.email, stoppedAt: { $exists: false } },
          { $set: { stoppedAt: watcher.stoppedAt } }
        )
      ).modifiedCount;
  silenced += result;
}

console.log(`places copied across: ${copied}`);
console.log(`numbers handed to the unnumbered: ${numbered}`);
console.log(`memberships stopped to match their watcher: ${silenced}`);
console.log(`memberships now: ${await memberships.countDocuments()}`);
console.log(dry ? "dry run - nothing written" : "done");

await mongoose.disconnect();
