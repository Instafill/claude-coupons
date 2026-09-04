// Per-day counts. "subs" is the watch list (the real subscriber metric since the list
// became the only door); "accts" is user rows, which the watch-confirm flow also creates.
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const db = mongoose.connection.db;

const byDay = async (coll, field = "createdAt", match = {}) => {
  const rows = await db.collection(coll).aggregate([
    { $match: { [field]: { $type: "date" }, ...match } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: `$${field}`, timezone: "UTC" } }, n: { $sum: 1 } } },
  ]).toArray();
  return Object.fromEntries(rows.map(r => [r._id, r.n]));
};

const subs = await byDay("watchers");
const confirmed = await byDay("watchers", "confirmedAt");
const stopped = await byDay("watchers", "stoppedAt");
const accts = await byDay("users");
const passes = await byDay("passes");
const unlocks = await byDay("unlocks");
const claims = await byDay("unlocks", "outcomeAt", { outcome: "claimed" });
const deads = await byDay("unlocks", "outcomeAt", { outcome: "dead" });
const rejects = await byDay("rejectedsubmissions");

const all = [subs, confirmed, stopped, accts, passes, unlocks, claims, deads, rejects];
const days = [...new Set(all.flatMap(Object.keys))].sort();
const p = (s, w) => String(s ?? 0).padStart(w);
console.log("date          subs  conf  stop   cum  accts  passes  unlocks  claims  dead  rejects");
let cum = 0;
for (const d of days) {
  cum += confirmed[d] || 0;
  console.log(`${d}  ${p(subs[d],4)}  ${p(confirmed[d],4)}  ${p(stopped[d],4)}  ${p(cum,4)}  ${p(accts[d],5)}  ${p(passes[d],6)}  ${p(unlocks[d],7)}  ${p(claims[d],6)}  ${p(deads[d],4)}  ${p(rejects[d],7)}`);
}

const W = db.collection("watchers");
const active = { confirmedAt: { $exists: true }, stoppedAt: { $exists: false }, leftQueueAt: { $exists: false } };
console.log("\nwatch list: %d total  %d confirmed  %d unconfirmed  %d stopped  %d served",
  await W.countDocuments(),
  await W.countDocuments({ confirmedAt: { $exists: true } }),
  await W.countDocuments({ confirmedAt: { $exists: false } }),
  await W.countDocuments({ stoppedAt: { $exists: true } }),
  await W.countDocuments({ leftQueueAt: { $exists: true } }));

// The queue only walks members that hold a number, so anyone confirmed before the queue
// shipped is invisible to it: no alerts, no standing, no unlock. Worth seeing every run.
const inQueue = await W.countDocuments({ ...active, position: { $exists: true } });
const orphaned = await W.countDocuments({ ...active, position: { $exists: false } });
console.log("queue: %d holding a number, %d confirmed WITHOUT one (cannot be alerted or unlock)", inQueue, orphaned);

// Test 1: what people say they will do after the free week. Only rows created after the
// question shipped can answer it, so the unanswered count is the pre-test population and
// not a response rate.
const intents = await W.aggregate([
  { $group: { _id: "$intent", n: { $sum: 1 } } },
  { $sort: { n: -1 } },
]).toArray();
const answered = intents.filter((i) => i._id).reduce((sum, i) => sum + i.n, 0);
console.log(
  "\nintent: %s  (%d answered, %d from before the question)",
  intents.filter((i) => i._id).map((i) => `${i._id}=${i.n}`).join(" ") || "none yet",
  answered,
  intents.find((i) => !i._id)?.n ?? 0
);

// Test 2: the price probe. Pressed, never charged.
const probed = await W.countDocuments({ skipProbeCount: { $gt: 0 } });
const inLineNotFirst = await W.countDocuments({ ...active, position: { $exists: true } });
console.log(
  "skip probe: %d pressed of %d in line (%s%%)",
  probed,
  inLineNotFirst,
  inLineNotFirst ? ((probed / inLineNotFirst) * 100).toFixed(1) : "0"
);

// Which other tools the list wants, asked once someone has confirmed. The opt-in is counted
// apart from the answers because it is a separate permission, not a stronger answer.
const asked = await W.countDocuments({ interestsAt: { $exists: true } });
if (asked) {
  const tools = await W.aggregate([
    { $unwind: "$interests" },
    { $group: { _id: "$interests", n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]).toArray();
  const optIn = await W.countDocuments({ interestsOptIn: true });
  console.log("\ntools wanted (%d answered, %d opted in to hear about them):", asked, optIn);
  for (const t of tools) console.log(`  ${String(t.n).padStart(3)}  ${t._id}`);
  const others = await W.find({ interestsOther: { $exists: true } }, { interestsOther: 1 }).toArray();
  if (others.length) console.log("  write-ins:", others.map((o) => o.interestsOther).join(" | "));
} else {
  console.log("\ntools wanted: nobody asked yet (shown once, right after confirming)");
}

console.log("\ntotals: accounts=%d passes=%d unlocks=%d claims=%d dead=%d rejects=%d",
  await db.collection("users").countDocuments(),
  await db.collection("passes").countDocuments(),
  await db.collection("unlocks").countDocuments(),
  await db.collection("unlocks").countDocuments({ outcome: "claimed" }),
  await db.collection("unlocks").countDocuments({ outcome: "dead" }),
  await db.collection("rejectedsubmissions").countDocuments());

const st = await db.collection("passes").aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray();
console.log("pass status:", st.map(s => `${s._id}=${s.n}`).join(" "));
console.log("users via google:", await db.collection("users").countDocuments({ googleId: { $exists: true, $ne: null } }));

await mongoose.disconnect();
