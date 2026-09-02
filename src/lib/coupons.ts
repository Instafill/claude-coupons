import { Types } from "mongoose";

import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import type { OfferSummary } from "@/lib/product-seo";
import Coupon, { COUPON_KIND, COUPON_STATUS, CouponKind } from "@/models/Coupon";
import CouponClaim from "@/models/CouponClaim";
import Drop, { DROP_STATUS, IDrop } from "@/models/Drop";
import Product from "@/models/Product";
import type { ISubscriber } from "@/models/Subscriber";

// Codes: how they are described, parsed from a paste, and summarised for the page. The
// claim path lives here too (see claimCode below, added with the drop machinery).

export const CODE_SHAPE = /^[A-Za-z0-9][A-Za-z0-9_\-.]{1,63}$/;

export function parseBulkCodes(text: string): { codes: string[]; rejected: string[] } {
  const seen = new Set<string>();
  const codes: string[] = [];
  const rejected: string[] = [];
  for (const raw of text.split(/[\n,;]+/)) {
    const code = raw.trim();
    if (!code) continue;
    if (!CODE_SHAPE.test(code)) {
      rejected.push(code.slice(0, 40));
      continue;
    }
    if (seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return { codes: codes.slice(0, 500), rejected };
}

// "50% off", "$20 off", "14 free days", or the founder's own words.
export function couponLabel(kind: CouponKind, value: number | undefined, custom: string): string {
  const note = custom.trim();
  switch (kind) {
    case COUPON_KIND.percent:
      return value ? `${value}% off${note ? ` ${note}` : ""}` : note || "Discount";
    case COUPON_KIND.fixed:
      return value ? `$${value} off${note ? ` ${note}` : ""}` : note || "Discount";
    case COUPON_KIND.free_days:
      return value ? `${value} free day${value === 1 ? "" : "s"}${note ? ` ${note}` : ""}` : note || "Free trial";
    default:
      return note || "Special offer";
  }
}

export function isCouponKind(value: string): value is CouponKind {
  return (Object.values(COUPON_KIND) as string[]).includes(value);
}

// What the contract says is on the table: codes in the pool before a release, or the live
// codes during one. Distinct labels, most common first.
export async function offerSummary(productId: Types.ObjectId, dropId?: Types.ObjectId | null): Promise<OfferSummary> {
  await dbConnect();
  const filter = dropId
    ? { dropId, status: { $in: [COUPON_STATUS.live, COUPON_STATUS.exhausted] } }
    : { productId, status: COUPON_STATUS.pool };
  const coupons = await Coupon.find(filter).select("label maxClaims").lean();
  const counts = new Map<string, number>();
  let count = 0;
  for (const coupon of coupons) {
    count += coupon.maxClaims;
    counts.set(coupon.label, (counts.get(coupon.label) ?? 0) + coupon.maxClaims);
  }
  const labels = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label]) => label);
  return { count, labels };
}

// ---- Claiming --------------------------------------------------------------------------

export interface ClaimedCode {
  code: string;
  label: string;
  terms: string | null;
  redeemUrl: string | null;
  expiresAt: string | null;
}

export type ClaimResult =
  | { ok: true; claim: ClaimedCode; repeat: boolean }
  | { ok: false; reason: "not_live" | "sold_out" | "not_subscribed" };

function isDuplicateKey(error: unknown): boolean {
  const e = error as { code?: number; cause?: { code?: number } } | null;
  return e?.code === 11000 || e?.cause?.code === 11000;
}

async function describe(couponId: Types.ObjectId, code: string): Promise<ClaimedCode> {
  const coupon = await Coupon.findById(couponId).lean();
  return {
    code,
    label: coupon?.label ?? "Coupon code",
    terms: coupon?.terms ?? null,
    redeemUrl: coupon?.redeemUrl ?? null,
    expiresAt: coupon?.expiresAt ? coupon.expiresAt.toISOString() : null,
  };
}

/**
 * Hands one code to one subscriber, once. Single-document atomics only: the coupon pick
 * is one findOneAndUpdate on `remaining > 0`, and the unique index on (drop, subscriber)
 * is what makes a second click - even a simultaneous one - return the same code rather
 * than a second one.
 */
export async function claimCode(input: {
  drop: IDrop;
  subscriber: ISubscriber;
  ipHash: string;
}): Promise<ClaimResult> {
  const { drop, subscriber } = input;
  await dbConnect();

  if (!subscriber.confirmedAt || subscriber.stoppedAt || !subscriber.productId.equals(drop.productId)) {
    return { ok: false, reason: "not_subscribed" };
  }

  const existing = await CouponClaim.findOne({ dropId: drop._id, subscriberId: subscriber._id });
  if (existing) return { ok: true, claim: await describe(existing.couponId, existing.code), repeat: true };

  const live = drop.status === DROP_STATUS.releasing || drop.status === DROP_STATUS.released;
  if (!live) return { ok: false, reason: drop.status === DROP_STATUS.exhausted ? "sold_out" : "not_live" };

  const coupon = await Coupon.findOneAndUpdate(
    { dropId: drop._id, status: COUPON_STATUS.live, remaining: { $gt: 0 } },
    { $inc: { remaining: -1, claimedCount: 1 } },
    { returnDocument: "after", sort: { createdAt: 1, _id: 1 } }
  );
  if (!coupon) {
    await markExhausted(drop);
    return { ok: false, reason: "sold_out" };
  }

  try {
    await CouponClaim.create({
      dropId: drop._id,
      subscriberId: subscriber._id,
      couponId: coupon._id,
      productId: drop.productId,
      code: coupon.code,
      ipHash: input.ipHash,
    });
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    // Lost a race with our own double click: give the code back and return the winner's.
    await Coupon.updateOne({ _id: coupon._id }, { $inc: { remaining: 1, claimedCount: -1 } });
    const winner = await CouponClaim.findOne({ dropId: drop._id, subscriberId: subscriber._id });
    if (!winner) return { ok: false, reason: "sold_out" };
    return { ok: true, claim: await describe(winner.couponId, winner.code), repeat: true };
  }

  if (coupon.remaining === 0) {
    await Coupon.updateOne({ _id: coupon._id, remaining: 0 }, { $set: { status: COUPON_STATUS.exhausted } });
  }
  const updated = await Drop.findOneAndUpdate({ _id: drop._id }, { $inc: { claimedCount: 1 } }, { returnDocument: "after" });
  if (updated && updated.claimedCount >= updated.capacity) await markExhausted(updated);

  logEvent("coupon_claimed", {
    product: drop.productId.toString(),
    drop: drop._id.toString(),
    subscriber: subscriber._id.toString(),
  });
  return { ok: true, claim: await describe(coupon._id, coupon.code), repeat: false };
}

async function markExhausted(drop: IDrop): Promise<void> {
  const result = await Drop.updateOne(
    { _id: drop._id, status: { $in: [DROP_STATUS.releasing, DROP_STATUS.released] } },
    { $set: { status: DROP_STATUS.exhausted, exhaustedAt: new Date() } }
  );
  if (result.modifiedCount) logEvent("drop_exhausted", { drop: drop._id.toString() });
}

/** The code this subscriber already holds for this drop, if any. */
export async function existingClaim(dropId: Types.ObjectId, subscriberId: Types.ObjectId): Promise<ClaimedCode | null> {
  await dbConnect();
  const claim = await CouponClaim.findOne({ dropId, subscriberId });
  return claim ? describe(claim.couponId, claim.code) : null;
}

// ---- Loading codes ---------------------------------------------------------------------

export async function addCoupons(input: {
  productId: Types.ObjectId;
  codes: string[];
  kind: CouponKind;
  value?: number;
  note: string;
  terms?: string;
  redeemUrl?: string;
  expiresAt?: Date;
  maxClaims: number;
  createdByUserId: Types.ObjectId;
}): Promise<{ added: number; duplicates: number }> {
  await dbConnect();
  const label = couponLabel(input.kind, input.value, input.note);
  const docs = input.codes.map((code) => ({
    productId: input.productId,
    code,
    kind: input.kind,
    ...(input.value !== undefined ? { value: input.value } : {}),
    label,
    ...(input.terms ? { terms: input.terms } : {}),
    ...(input.redeemUrl ? { redeemUrl: input.redeemUrl } : {}),
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    maxClaims: input.maxClaims,
    remaining: input.maxClaims,
    status: COUPON_STATUS.pool,
    createdByUserId: input.createdByUserId,
  }));

  let added = 0;
  try {
    const inserted = await Coupon.insertMany(docs, { ordered: false });
    added = inserted.length;
  } catch (error) {
    // ordered:false keeps going past duplicates; Mongoose reports the survivors here.
    const e = error as { insertedDocs?: unknown[]; code?: number };
    if (!isDuplicateKey(error) && e.code !== 11000 && !e.insertedDocs) throw error;
    added = e.insertedDocs?.length ?? 0;
  }
  await syncPool(input.productId);
  return { added, duplicates: input.codes.length - added };
}

export async function revokeCoupon(productId: Types.ObjectId, couponId: string): Promise<boolean> {
  await dbConnect();
  if (!Types.ObjectId.isValid(couponId)) return false;
  const result = await Coupon.updateOne(
    { _id: new Types.ObjectId(couponId), productId, status: COUPON_STATUS.pool },
    { $set: { status: COUPON_STATUS.revoked, remaining: 0 } }
  );
  await syncPool(productId);
  return result.modifiedCount === 1;
}

// Keeps Product.poolCapacity equal to what is actually loaded, after any pool change.
export async function syncPool(productId: Types.ObjectId): Promise<number> {
  const pooled = await Coupon.aggregate<{ capacity: number }>([
    { $match: { productId, status: COUPON_STATUS.pool } },
    { $group: { _id: null, capacity: { $sum: "$remaining" } } },
  ]);
  const capacity = pooled[0]?.capacity ?? 0;
  await Product.updateOne({ _id: productId }, { $set: { poolCapacity: capacity } });
  return capacity;
}
