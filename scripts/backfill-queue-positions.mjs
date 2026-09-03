// One-time repair. The queue shipped without giving numbers to the people already on the
// list, and every walk in src/lib/queue.ts goes by number - so the 41 who confirmed before
// it shipped got no alert, no standing, and no unlock, while still counting as members.
//
// queue.ts now adopts unnumbered members on its own, but adoption hands out the next number
// and would file four days of early subscribers behind a day of late ones. This restores
// the order the queue would have had if it had always existed: everyone waiting, numbered
// by when they confirmed. Safe to re-run - the order is derived, not incremented.
//
//   node --env-file=.env.local --require ./dns-fix.cjs scripts/backfill-queue-positions.mjs
//   APPLY=1 node --env-file=.env.local --require ./dns-fix.cjs scripts/backfill-queue-positions.mjs
import mongoose from "mongoose";

const apply = process.env.APPLY === "1";
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const db = mongoose.connection.db;
const watchers = db.collection("watchers");

// Everyone still waiting. People already served keep the number they were served under.
const waiting = await watchers
  .find({ confirmedAt: { $exists: true }, stoppedAt: { $exists: false }, leftQueueAt: { $exists: false } })
  .sort({ confirmedAt: 1, _id: 1 })
  .toArray();

const moves = waiting
  .map((watcher, index) => ({ watcher, from: watcher.position ?? null, to: index + 1 }))
  .filter(({ from, to }) => from !== to);

console.log(`${waiting.length} waiting, ${moves.length} to renumber\n`);
console.log("new  was  confirmed          email");
for (const { watcher, from, to } of moves) {
  const email = watcher.email.replace(/^(.{2}).*(@.*)$/, "$1***$2");
  console.log(
    `${String(to).padStart(3)}  ${String(from ?? "-").padStart(3)}  ${watcher.confirmedAt.toISOString().slice(0, 16)}  ${email}`
  );
}

if (!apply) {
  console.log("\nDry run. Re-run with APPLY=1 to write.");
} else {
  await watchers.bulkWrite(
    moves.map(({ watcher, to }) => ({
      updateOne: { filter: { _id: watcher._id }, update: { $set: { position: to } } },
    }))
  );
  // The counter is the high-water mark for numbers handed out, so it has to clear the last
  // one placed or the next person to confirm collides with someone already in line.
  await db
    .collection("counters")
    .updateOne({ _id: "queue" }, { $set: { value: waiting.length } }, { upsert: true });
  console.log(`\nRenumbered ${moves.length}. Queue counter set to ${waiting.length}.`);

  const stillUnnumbered = await watchers.countDocuments({
    confirmedAt: { $exists: true },
    stoppedAt: { $exists: false },
    leftQueueAt: { $exists: false },
    position: { $exists: false },
  });
  const distinct = (await watchers.distinct("position", { position: { $type: "number" } })).length;
  console.log(`Verify: ${stillUnnumbered} unnumbered, ${distinct} distinct numbers across the line.`);
}

await mongoose.disconnect();
