// Creates or updates product pages from a JSON file, for the seed pages that exist before
// their founders do. Idempotent - re-running updates text and leaves counters alone.
//
//   node --require ./dns-fix.cjs --env-file=.env.local scripts/import-products.mjs data/products.json
//
// Each entry: { name, websiteUrl, tagline, description, slug?, logoUrl?, threshold?, faqs? }.
// Descriptions under 60 words are refused: a page that says nothing about the product is
// a doorway page, and both Google and the founder it is meant to attract treat it as one.
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
const file = process.argv[2];
if (!uri || !file) {
  console.error("Set MONGODB_URI and pass the JSON file: scripts/import-products.mjs data/products.json");
  process.exit(1);
}

const MIN_WORDS = 60;
const RESERVED = new Set(["new", "admin", "api", "claim", "confirm", "stop", "me", "drops", "all", "categories", "category", "founders", "wanted"]);
const TWO_LEVEL = new Set(["co.uk", "org.uk", "ac.uk", "com.au", "net.au", "co.jp", "co.nz", "com.br", "co.in", "co.za", "com.mx", "com.sg"]);

function slugify(input) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

function domainOf(url) {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  const labels = host.split(".");
  if (labels.length <= 2) return host;
  const lastTwo = labels.slice(-2).join(".");
  return TWO_LEVEL.has(lastTwo) ? labels.slice(-3).join(".") : lastTwo;
}

const entries = JSON.parse(await readFile(file, "utf8"));
if (!Array.isArray(entries)) {
  console.error("The file must contain a JSON array of products.");
  process.exit(1);
}

await mongoose.connect(uri);
const db = mongoose.connection.db;
console.log("connected to db:", db.databaseName);

// The unique indexes are correctness guards, not conveniences, so they exist before the
// first write rather than whenever Mongoose gets around to them.
await db.collection("products").createIndex({ slug: 1 }, { unique: true });
await db.collection("products").createIndex({ status: 1, confirmedCount: -1 });
await db.collection("subscribers").createIndex({ productId: 1, email: 1 }, { unique: true });
await db.collection("subscribers").createIndex({ accessToken: 1 }, { unique: true });
await db.collection("subscribers").createIndex({ confirmToken: 1 }, { sparse: true });
await db.collection("subscribers").createIndex({ productId: 1, confirmedAt: 1, stoppedAt: 1, lastNotifiedDropId: 1, _id: 1 });
await db.collection("coupons").createIndex({ productId: 1, code: 1 }, { unique: true });
await db.collection("coupons").createIndex({ dropId: 1, status: 1, remaining: 1, createdAt: 1 });
await db.collection("drops").createIndex({ productId: 1, number: 1 }, { unique: true });
await db.collection("couponclaims").createIndex({ dropId: 1, subscriberId: 1 }, { unique: true });
await db.collection("ownershiprequests").createIndex({ productId: 1, userId: 1 }, { unique: true });

const products = db.collection("products");
let created = 0;
let updated = 0;
let skipped = 0;

for (const entry of entries) {
  const name = String(entry.name || "").trim();
  const tagline = String(entry.tagline || "").trim();
  const description = String(entry.description || "").trim();
  const websiteUrl = String(entry.websiteUrl || "").trim();
  const words = description.split(/\s+/).filter(Boolean).length;
  const slug = entry.slug ? String(entry.slug).trim().toLowerCase() : slugify(name);

  let problem = null;
  if (name.length < 2) problem = "missing name";
  else if (tagline.length < 10 || tagline.length > 140) problem = "tagline must be 10-140 characters";
  else if (words < MIN_WORDS) problem = `description has ${words} words, needs ${MIN_WORDS}`;
  else if (!websiteUrl.startsWith("https://")) problem = "websiteUrl must be https://";
  else if (!/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/.test(slug) || RESERVED.has(slug)) problem = `slug "${slug}" is not usable`;
  if (problem) {
    console.log(`skip  ${name || "(unnamed)"}: ${problem}`);
    skipped++;
    continue;
  }

  const now = new Date();
  const threshold = Number.isInteger(entry.threshold) ? entry.threshold : 100;
  const faqs = Array.isArray(entry.faqs)
    ? entry.faqs.filter((f) => f && f.q && f.a).map((f) => ({ q: String(f.q), a: String(f.a) })).slice(0, 12)
    : [];

  const result = await products.updateOne(
    { slug },
    {
      $set: {
        name,
        tagline,
        description,
        websiteUrl,
        websiteDomain: domainOf(websiteUrl),
        ...(entry.logoUrl ? { logoUrl: String(entry.logoUrl) } : {}),
        faqs,
        updatedAt: now,
      },
      $setOnInsert: {
        slug,
        status: "published",
        source: "import",
        threshold,
        baseline: 0,
        confirmedCount: 0,
        positionCounter: 0,
        poolCapacity: 0,
        dropCount: 0,
        createdAt: now,
      },
    },
    { upsert: true }
  );
  if (result.upsertedCount) {
    created++;
    console.log(`new   /coupons/${slug}`);
  } else {
    updated++;
    console.log(`kept  /coupons/${slug} (text refreshed)`);
  }
}

console.log(`created ${created}, updated ${updated}, skipped ${skipped}`);
await mongoose.disconnect();
