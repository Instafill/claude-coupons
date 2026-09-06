// One-time cleanup. Locations captured before src/lib/geo.ts read a single source per
// request paired Cloudflare's country with Vercel's city, so rows say things like
// "Amsterdam (IN)". There is no way to tell which half of any given row was right.
//
// The country is kept: it always came from cf-ipcountry, which every request carries. The
// city, region and timezone are cleared, and placeWatcher fills them in coherently the next
// time that person loads the board - which is what it already does for everyone else.
//
//   node --env-file=.env.local --require ./dns-fix.cjs scripts/clear-mixed-geo.mjs
//   APPLY=1 node --env-file=.env.local --require ./dns-fix.cjs scripts/clear-mixed-geo.mjs
import mongoose from "mongoose";

const apply = process.env.APPLY === "1";
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const watchers = mongoose.connection.db.collection("watchers");

const affected = await watchers.countDocuments({ city: { $exists: true } });
const keepCountry = await watchers.countDocuments({ country: { $exists: true } });
console.log(`${affected} rows carry a city from the mixed read; ${keepCountry} carry a country (kept)\n`);

const sample = await watchers
  .find({ city: { $exists: true } }, { city: 1, region: 1, country: 1 })
  .limit(10)
  .toArray();
for (const row of sample) console.log(`  ${row.city} / ${row.region ?? "-"} (${row.country ?? "-"})`);

if (!apply) {
  console.log("\nDry run. Re-run with APPLY=1 to clear city, region and timezone.");
} else {
  const result = await watchers.updateMany(
    { city: { $exists: true } },
    { $unset: { city: "", region: "", timezone: "" } }
  );
  console.log(`\nCleared ${result.modifiedCount}. Countries left alone: ${keepCountry}.`);
  console.log(`Cities remaining: ${await watchers.countDocuments({ city: { $exists: true } })}`);
}

await mongoose.disconnect();
