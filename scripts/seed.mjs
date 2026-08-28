// Lists a referral link so the board is never empty. Idempotent - safe to re-run.
// The pass to seed is never hardcoded: it is a live referral link that anyone reading
// this file could otherwise spend.
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
const code = process.env.SEED_CODE;
const email = process.env.SEED_EMAIL?.toLowerCase();

if (!uri || !code || !email) {
  console.error("Set MONGODB_URI, SEED_CODE and SEED_EMAIL to seed the board.");
  process.exit(1);
}

await mongoose.connect(uri);
const db = mongoose.connection.db;
console.log("connected to db:", db.databaseName);

const users = db.collection("users");
const passes = db.collection("passes");
await users.createIndex({ email: 1 }, { unique: true });
await passes.createIndex({ code: 1 }, { unique: true });
await db.collection("unlocks").createIndex({ passId: 1, userId: 1 }, { unique: true });

const now = new Date();
await users.updateOne(
  { email },
  { $setOnInsert: { email, createdAt: now, updatedAt: now } },
  { upsert: true }
);
const user = await users.findOne({ email });

const res = await passes.updateOne(
  { code },
  {
    $setOnInsert: {
      code,
      submitterUserId: user._id,
      status: "live",
      lastRefreshedAt: now,
      unlockCount: 0,
      claimedCount: 0,
      deadCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  },
  { upsert: true }
);
console.log(res.upsertedCount ? `seeded pass ${code}` : `pass ${code} already listed`);
console.log("collections:", (await db.listCollections().toArray()).map((c) => c.name).join(", "));
await mongoose.disconnect();
