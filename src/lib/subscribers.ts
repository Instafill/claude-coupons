import crypto from "crypto";
import { Types } from "mongoose";

import { isDisposable } from "@/lib/domains";
import { onGoalReached } from "@/lib/drops";
import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import { sendSubscribeConfirmation } from "@/lib/sendgrid";
import { baseUrl } from "@/lib/watchers";
import Product, { IProduct } from "@/models/Product";
import Subscriber, { ISubscriber } from "@/models/Subscriber";

// One product's waiting list: who is on it, where they stand, and the only two ways an
// address gets on or off. Mirrors lib/watchers.ts, with a place in line added.

export const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const CONFIRM_WINDOW_DAYS = 7;
const RESEND_COOLDOWN_MINUTES = 10;
// Bounds how many strangers one connection can put a confirmation request in front of.
const CONFIRMATIONS_PER_IP_PER_DAY = 5;

// The sentence shown next to the form. Stored verbatim with the row, so the consent on
// record is the consent that was given, not whatever the form says this month.
export function consentText(productName: string): string {
  return `Email me when the ${productName} drop happens. Nothing else.`;
}

function token(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function confirmUrl(slug: string, value: string): string {
  return `${baseUrl()}/api/coupons/${slug}/confirm?token=${value}`;
}

export function stopUrl(slug: string, value: string): string {
  return `${baseUrl()}/api/coupons/${slug}/stop?token=${value}`;
}

// The link in the drop email. The same token identifies the subscriber on the page, so
// claiming needs no sign-in - the email was proven when the address was confirmed.
export function claimUrl(slug: string, value: string): string {
  return `${baseUrl()}/coupons/${slug}?t=${value}`;
}

export type SubscribeResult =
  | { status: "confirmed"; position: number }
  | { status: "already"; position: number }
  | { status: "sent" }
  | { status: "rejected"; error: string };

/**
 * Puts an address in line, or sends it a confirmation request. `preVerified` is for the
 * caller's own session address, already proven through Google or a magic link.
 *
 * Throttling is never reported: a throttled request sends nothing and answers the same as
 * one that did, so this cannot be used to discover who is on a list.
 */
export async function subscribe(input: {
  product: IProduct;
  email: string;
  ipHash: string;
  userId?: string;
  preVerified: boolean;
}): Promise<SubscribeResult> {
  const { product } = input;
  if (!EMAIL_SHAPE.test(input.email)) return { status: "rejected", error: "That doesn't look like an email address." };
  if (isDisposable(input.email))
    return { status: "rejected", error: "Throwaway addresses can't hold a place - the drop email would never reach you." };

  await dbConnect();
  const now = new Date();
  const existing = await Subscriber.findOne({ productId: product._id, email: input.email });

  if (existing?.confirmedAt && !existing.stoppedAt) {
    return { status: "already", position: existing.position ?? 0 };
  }

  const subscriber =
    existing ?? new Subscriber({ productId: product._id, email: input.email, accessToken: token() });
  // Re-subscribing after stopping reuses the row - the unique index on (product, email)
  // means there is only ever one - and gets a new place in line: they left the old one.
  subscriber.stoppedAt = undefined;
  subscriber.ipHash = input.ipHash;
  subscriber.consentText = consentText(product.name);
  subscriber.consentAt = now;
  if (input.userId) subscriber.userId = new Types.ObjectId(input.userId);

  if (input.preVerified) {
    subscriber.confirmedAt = now;
    subscriber.confirmToken = undefined;
    subscriber.position = undefined;
    await subscriber.save();
    const position = await placeInLine(subscriber);
    logEvent("subscriber_confirmed", { product: product._id.toString(), via: "session" });
    return { status: "confirmed", position };
  }

  const resendBlocked = Boolean(
    subscriber.confirmSentAt &&
      now.getTime() - subscriber.confirmSentAt.getTime() < RESEND_COOLDOWN_MINUTES * 60 * 1000
  );
  const fromThisConnection = await Subscriber.countDocuments({
    ipHash: input.ipHash,
    confirmSentAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
  });

  if (resendBlocked || fromThisConnection >= CONFIRMATIONS_PER_IP_PER_DAY) {
    await subscriber.save();
    logEvent("subscriber_throttled", { product: product._id.toString(), reason: resendBlocked ? "resend" : "ip" });
    return { status: "sent" };
  }

  subscriber.confirmToken = token();
  subscriber.confirmSentAt = now;
  await subscriber.save();
  await sendSubscribeConfirmation(subscriber.email, {
    productName: product.name,
    confirmUrl: confirmUrl(product.slug, subscriber.confirmToken),
    goal: product.threshold,
  });
  logEvent("subscriber_subscribed", { product: product._id.toString(), returning: Boolean(existing) });
  return { status: "sent" };
}

// Hands out the next place in line and moves the product's counters, then checks the goal.
// The counter lives on the product and is bumped atomically, so two confirmations in the
// same instant get two different numbers.
async function placeInLine(subscriber: ISubscriber): Promise<number> {
  const product = await Product.findOneAndUpdate(
    { _id: subscriber.productId },
    { $inc: { positionCounter: 1, confirmedCount: 1 } },
    { returnDocument: "after" }
  );
  if (!product) return 0;
  await Subscriber.updateOne(
    { _id: subscriber._id, position: { $exists: false } },
    { $set: { position: product.positionCounter } }
  );
  if (product.confirmedCount >= product.baseline + product.threshold) {
    await onGoalReached(product);
  }
  return product.positionCounter;
}

/** Spends a confirmation token. Returns the product slug to land on, or null. */
export async function confirm(value: string): Promise<{ slug: string; accessToken: string; position: number } | null> {
  await dbConnect();
  const cutoff = new Date(Date.now() - CONFIRM_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const subscriber = await Subscriber.findOneAndUpdate(
    { confirmToken: value, confirmSentAt: { $gte: cutoff } },
    { $set: { confirmedAt: new Date() }, $unset: { confirmToken: "", stoppedAt: "", position: "" } },
    { returnDocument: "after" }
  );
  if (!subscriber) {
    logEvent("subscriber_confirm_rejected");
    return null;
  }
  const product = await Product.findById(subscriber.productId).select("slug");
  if (!product) return null;
  const position = await placeInLine(subscriber);
  logEvent("subscriber_confirmed", { product: product._id.toString(), via: "email" });
  return { slug: product.slug, accessToken: subscriber.accessToken, position };
}

/**
 * Takes an address off one list. Gives no sign of whether the token matched, so the link
 * is safe to press twice and useless for probing who is on a list.
 */
export async function stop(value: string): Promise<string | null> {
  await dbConnect();
  const subscriber = await Subscriber.findOneAndUpdate(
    { accessToken: value, stoppedAt: { $exists: false } },
    { $set: { stoppedAt: new Date() }, $unset: { confirmToken: "" } }
  );
  if (!subscriber) {
    logEvent("subscriber_stop_nomatch");
    return null;
  }
  // Only a confirmed row was counted, so only a confirmed row is uncounted.
  if (subscriber.confirmedAt) {
    await Product.updateOne({ _id: subscriber.productId, confirmedCount: { $gt: 0 } }, { $inc: { confirmedCount: -1 } });
  }
  logEvent("subscriber_stopped", { product: subscriber.productId.toString() });
  const product = await Product.findById(subscriber.productId).select("slug");
  return product?.slug ?? null;
}

// Who is asking: the token from an email link first, the signed-in address second. The
// token wins because it is the thing the drop email handed out; the session is for people
// who joined while signed in and never had a link.
export async function resolveSubscriber(input: {
  product: IProduct;
  token?: string | null;
  sessionEmail?: string | null;
}): Promise<ISubscriber | null> {
  await dbConnect();
  if (input.token) {
    const byToken = await Subscriber.findOne({ productId: input.product._id, accessToken: input.token });
    if (byToken) return byToken;
  }
  if (input.sessionEmail) {
    return Subscriber.findOne({ productId: input.product._id, email: input.sessionEmail.toLowerCase() });
  }
  return null;
}

export function isActive(subscriber: ISubscriber | null): subscriber is ISubscriber {
  return Boolean(subscriber?.confirmedAt && !subscriber.stoppedAt);
}
