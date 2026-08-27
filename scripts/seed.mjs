// Lists our own referral link so the board is never empty. Idempotent - safe to re-run.
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
const code = process.env.SEED_CODE || "ygonyoOrXw";
const email = (process.env.SEED_EMAIL || "alex@botmakers.net").toLowerCase();

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
