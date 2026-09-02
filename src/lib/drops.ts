import { Types } from "mongoose";

import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import { notifyAdmin, sendDropAlerts, sendGoalReached } from "@/lib/sendgrid";
import { baseUrl } from "@/lib/watchers";
import Coupon, { COUPON_STATUS } from "@/models/Coupon";
import Drop, { DROP_STATUS, IDrop } from "@/models/Drop";
import Product, { IProduct } from "@/models/Product";
import Subscriber from "@/models/Subscriber";
import User from "@/models/User";

// A drop is one release of codes to one list. Reaching the goal opens one; only a person
// releases it. The fan-out is idempotent and resumable: every subscriber row remembers the
// last drop it was told about, so pressing Release twice never mails anyone twice.

// The fan-out runs inside the founder's request, so one press has a ceiling; the dashboard
// says how many are left and the next press continues from there.
const MAX_RECIPIENTS_PER_RUN = 500;

async function openDrop(product: IProduct): Promise<IDrop | null> {
  if (!product.currentDropId) return null;
  const drop = await Drop.findById(product.currentDropId);
  if (!drop || drop.status === DROP_STATUS.exhausted) return null;
  return drop;
}

async function createPendingDrop(product: IProduct): Promise<IDrop> {
  const bumped = await Product.findOneAndUpdate({ _id: product._id }, { $inc: { dropCount: 1 } }, { returnDocument: "after" });
  const drop = await Drop.create({
    productId: product._id,
    number: bumped?.dropCount ?? product.dropCount + 1,
    status: DROP_STATUS.pending,
  });
  await Product.updateOne({ _id: product._id }, { $set: { currentDropId: drop._id } });
  logEvent("drop_opened", { product: product._id.toString(), drop: drop._id.toString(), number: drop.number });
  return drop;
}

// The list hit its goal. Opens a pending drop if none is open and tells whoever can release
// it - the owner, or the admin when nobody has claimed the page. Nothing is sent to the list.
export async function onGoalReached(product: IProduct): Promise<void> {
  try {
    await dbConnect();
    let drop = await openDrop(product);
    if (!drop) drop = await createPendingDrop(product);
    if (drop.ownerNotifiedAt) return;

    const waiting = product.confirmedCount - product.baseline;
    const dashboardUrl = `${baseUrl()}/founders/${product.slug}`;
    const owner = product.ownerUserId ? await User.findById(product.ownerUserId).select("email") : null;
    if (owner) {
      await sendGoalReached(owner.email, { productName: product.name, waiting, dashboardUrl });
    }
    await notifyAdmin(
      `${owner ? "Goal reached" : "Goal reached on unofficial page"}: ${product.name}`,
      [`${waiting} people are waiting for ${product.name} codes.`, owner ? "The owner has been emailed." : "Nobody has claimed this page yet - time to reach out."],
      dashboardUrl
    );
    await Drop.updateOne({ _id: drop._id }, { $set: { ownerNotifiedAt: new Date() } });
    logEvent("drop_goal_reached", { product: product._id.toString(), drop: drop._id.toString(), waiting, owned: Boolean(owner) });
  } catch (error) {
    // A mail problem must never cost the subscriber their confirmation.
    console.error("Goal handling failed:", error);
  }
}

export type ReleaseResult =
  | { ok: true; drop: IDrop; sent: number; remaining: number; done: boolean }
  | { ok: false; error: string };

/**
 * Releases the open drop (opening one if needed): attaches every pooled code, then emails
 * the list. Returns how many were reached this run and how many are still to be told.
 */
export async function releaseDrop(product: IProduct, by: "founder" | "admin"): Promise<ReleaseResult> {
  await dbConnect();
  let drop = await openDrop(product);
  if (!drop) drop = await createPendingDrop(product);

  if (drop.status === DROP_STATUS.pending) {
    const pooled = await Coupon.aggregate<{ capacity: number }>([
      { $match: { productId: product._id, status: COUPON_STATUS.pool } },
      { $group: { _id: null, capacity: { $sum: "$remaining" } } },
    ]);
    const capacity = pooled[0]?.capacity ?? 0;
    if (capacity <= 0) return { ok: false, error: "Load at least one code before releasing." };

    await Coupon.updateMany(
      { productId: product._id, status: COUPON_STATUS.pool },
      { $set: { dropId: drop._id, status: COUPON_STATUS.live } }
    );
    const fresh = await Product.findById(product._id).select("confirmedCount");
    const confirmed = fresh?.confirmedCount ?? product.confirmedCount;
    const now = new Date();
    drop = (await Drop.findOneAndUpdate(
      { _id: drop._id },
      {
        $set: {
          status: DROP_STATUS.releasing,
          releasedBy: by,
          capacity,
          subscribersAtRelease: confirmed,
          releasedAt: now,
          "notify.total": confirmed,
        },
      },
      { returnDocument: "after" }
    ))!;
    await Product.updateOne(
      { _id: product._id },
      { $set: { baseline: confirmed, poolCapacity: 0, lastDropAt: now } }
    );
    logEvent("drop_released", { product: product._id.toString(), drop: drop._id.toString(), capacity, subscribers: confirmed, by });
    await notifyAdmin(`Drop #${drop.number} released for ${product.name}`, [`${capacity} codes to ${confirmed} subscribers, released by the ${by}.`], `${baseUrl()}/coupons/${product.slug}`);
  }

  if (drop.status === DROP_STATUS.released) {
    return { ok: true, drop, sent: 0, remaining: 0, done: true };
  }

  const labels = await Coupon.distinct("label", { dropId: drop._id });
  const pending = {
    productId: product._id,
    confirmedAt: { $exists: true },
    stoppedAt: { $exists: false },
    lastNotifiedDropId: { $ne: drop._id },
  };
  const batch = await Subscriber.find(pending).sort({ _id: 1 }).limit(MAX_RECIPIENTS_PER_RUN);

  let sent = 0;
  if (batch.length > 0) {
    const waiting = drop.subscribersAtRelease;
    const delivered = new Set(
      await sendDropAlerts(
        batch.map((s) => ({
          email: s.email,
          claimUrl: `${baseUrl()}/coupons/${product.slug}?t=${s.accessToken}`,
          stopUrl: `${baseUrl()}/api/coupons/${product.slug}/stop?token=${s.accessToken}`,
          productName: product.name,
          capacity: drop.capacity,
          waiting,
          labels,
        }))
      )
    );
    const reached = batch.filter((s) => delivered.has(s.email));
    sent = reached.length;
    await Subscriber.updateMany(
      { _id: { $in: reached.map((s) => s._id) } },
      { $set: { lastNotifiedDropId: drop._id, lastNotifiedAt: new Date() }, $inc: { notifyCount: 1 } }
    );
    await Drop.updateOne(
      { _id: drop._id },
      { $inc: { "notify.sent": sent, "notify.failed": batch.length - sent } }
    );
    logEvent("drop_alerts_sent", { drop: drop._id.toString(), recipients: sent, failed: batch.length - sent });
  }

  // A hard-failing address stays unmarked and would be retried forever; it is the
  // remaining count, not a stuck state, and the founder can see it on the dashboard.
  const remaining = await Subscriber.countDocuments(pending);
  const done = remaining === 0;
  if (done && drop.status === DROP_STATUS.releasing) {
    await Drop.updateOne({ _id: drop._id, status: DROP_STATUS.releasing }, { $set: { status: DROP_STATUS.released } });
  }
  const latest = await Drop.findById(drop._id);
  return { ok: true, drop: latest ?? drop, sent, remaining, done };
}

/** The drops a product has run, newest first, for the dashboard and the proof line. */
export async function listDrops(productId: Types.ObjectId): Promise<IDrop[]> {
  await dbConnect();
  return Drop.find({ productId }).sort({ number: -1 });
}
