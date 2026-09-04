// One-time repair. On 2026-09-04 two passes were listed 39 seconds apart, and each walked
// the same front of the queue: everyone got the same "your turn" email twice inside a
// minute, and offersSinceUnlock was charged twice for what was really one chance to act.
// With demotion at three, the whole front row sat one offer from the back.
//
// sendWave now skips anyone alerted within the last wave period (no mail, no charge), so
// this cannot recur; this script refunds the one unfair charge that already landed. Only
// rows still in line at exactly 2, double-mailed that night, are touched - by the time of
// the incident nobody in line held any other count, so the honest value is 1.
//
//   node --env-file=.env.local --require ./dns-fix.cjs scripts/repair-double-offers.mjs
//   APPLY=1 node --env-file=.env.local --require ./dns-fix.cjs scripts/repair-double-offers.mjs
import mongoose from "mongoose";

const apply = process.env.APPLY === "1";
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const db = mongoose.connection.db;
const watchers = db.collection("watchers");

const filter = {
  confirmedAt: { $exists: true },
  stoppedAt: { $exists: false },
  leftQueueAt: { $exists: false },
  position: { $exists: true },
  offersSinceUnlock: 2,
  lastNotifiedAt: { $gte: new Date("2026-09-04T01:00:00Z") },
};

const rows = await watchers.find(filter).sort({ position: 1 }).toArray();
console.log(`${rows.length} in line at offersSinceUnlock=2 from the double send\n`);
console.log("pos  notified            email");
for (const w of rows) {
  const email = w.email.replace(/^(.{2}).*(@.*)$/, "$1***$2");
  console.log(`${String(w.position).padStart(3)}  ${w.lastNotifiedAt.toISOString().slice(0, 16)}  ${email}`);
}

if (!apply) {
  console.log("\nDry run. Re-run with APPLY=1 to write.");
} else {
  const result = await watchers.updateMany(filter, { $inc: { offersSinceUnlock: -1 } });
  console.log(`\nRefunded one offer on ${result.modifiedCount} rows.`);
  const spread = await watchers
    .aggregate([
      { $match: { confirmedAt: { $exists: true }, stoppedAt: { $exists: false }, leftQueueAt: { $exists: false } } },
      { $group: { _id: "$offersSinceUnlock", n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  console.log("Verify:", spread.map((r) => `offers=${r._id}: ${r.n}`).join("  "));
}

await mongoose.disconnect();
