import crypto from "crypto";
import { Types } from "mongoose";

import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import { SITE_URL } from "@/lib/seo";
import { sendPassAlerts, sendWatchConfirmation } from "@/lib/sendgrid";
import Watcher, { IWatcher } from "@/models/Watcher";

// The watch list: everything that decides whether an address is on it, and everything that
// decides whether it receives mail. The routes below this only translate HTTP into these
// calls, so the rules live in one readable place.

export const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// A confirmation link is useless after this long - by then the empty board that prompted it
// has almost certainly refilled and emptied again.
const CONFIRM_WINDOW_DAYS = 7;
// Asking twice in quick succession sends one email, not two.
const RESEND_COOLDOWN_MINUTES = 10;
// Bounds how many strangers one connection can put a confirmation request in front of.
const CONFIRMATIONS_PER_IP_PER_DAY = 5;
// The floor between two alerts to the same address, whatever the board does.
const ALERT_COOLDOWN_HOURS = 12;
// The fan-out runs inside the submitter's request, so the list has to have a ceiling.
const MAX_ALERT_RECIPIENTS = 500;

function token(): string {
  return crypto.randomBytes(24).toString("hex");
}

// Links have to be absolute: they are read in a mail client, not a browser tab.
export function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || SITE_URL;
}

export function confirmUrl(value: string): string {
  return `${baseUrl()}/api/watch/confirm?token=${value}`;
}

export function stopUrl(value: string): string {
  return `${baseUrl()}/api/watch/stop?token=${value}`;
}

export function enterUrl(value: string): string {
  return `${baseUrl()}/api/watch/enter?token=${value}`;
}

/**
 * Puts an address on the list, or sends it a confirmation request.
 *
 * `preVerified` is for an address that arrived from the caller's own session - it reached us
 * through Google or a magic link already, so asking them to prove it a third time would be
 * theatre. Every other address gets the confirmation step.
 *
 * Never reports throttling to the caller. A throttled request simply sends nothing, and the
 * answer is the same either way, so this cannot be used to discover who is on the list.
 */
export async function subscribe(input: {
  email: string;
  ipHash: string;
  userId?: string;
  preVerified: boolean;
}): Promise<{ watching: boolean }> {
  await dbConnect();
  const now = new Date();
  const existing = await Watcher.findOne({ email: input.email });

  // Already watching: nothing to change, and nothing to send.
  if (existing?.confirmedAt && !existing.stoppedAt) return { watching: true };

  const watcher = existing ?? new Watcher({ email: input.email, stopToken: token() });
  // Re-subscribing after stopping reuses the row - the unique index on email means there is
  // only ever one, and the stop token stays valid so old alerts keep working.
  watcher.stoppedAt = undefined;
  watcher.ipHash = input.ipHash;
  if (input.userId) watcher.userId = new Types.ObjectId(input.userId);

  if (input.preVerified) {
    watcher.confirmedAt = now;
    watcher.confirmToken = undefined;
    await watcher.save();
    logEvent("watch_confirmed", { via: "session" });
    return { watching: true };
  }

  const resendBlocked = Boolean(
    watcher.confirmSentAt &&
      now.getTime() - watcher.confirmSentAt.getTime() < RESEND_COOLDOWN_MINUTES * 60 * 1000
  );
  const fromThisConnection = await Watcher.countDocuments({
    ipHash: input.ipHash,
    confirmSentAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
  });

  if (resendBlocked || fromThisConnection >= CONFIRMATIONS_PER_IP_PER_DAY) {
    await watcher.save();
    logEvent("watch_throttled", { reason: resendBlocked ? "resend" : "ip" });
    return { watching: false };
  }

  watcher.confirmToken = token();
  watcher.confirmSentAt = now;
  await watcher.save();
  await sendWatchConfirmation(watcher.email, confirmUrl(watcher.confirmToken));
  logEvent("watch_subscribed", { returning: Boolean(existing) });
  return { watching: false };
}

/**
 * Spends a confirmation token. Clearing it is what makes a replayed link find nothing.
 * Returns the address so the caller can start its session: clicking the link proved the
 * mailbox, which is exactly what a magic link proves, and the list is the door.
 */
export async function confirm(value: string): Promise<{ email: string } | null> {
  await dbConnect();
  const cutoff = new Date(Date.now() - CONFIRM_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const watcher = await Watcher.findOneAndUpdate(
    { confirmToken: value, confirmSentAt: { $gte: cutoff } },
    // Clearing stoppedAt too: confirming is an unambiguous "yes", so it revives a row that
    // someone stopped and then signed up for again.
    { $set: { confirmedAt: new Date() }, $unset: { confirmToken: "", stoppedAt: "" } },
    { returnDocument: "after" }
  );
  if (!watcher) {
    logEvent("watch_confirm_rejected");
    return null;
  }
  logEvent("watch_confirmed", { via: "email" });
  return { email: watcher.email };
}

/** The link in an alert email: an active address gets its session and lands on the board. */
export async function enter(value: string): Promise<{ email: string } | null> {
  await dbConnect();
  const watcher = await Watcher.findOne({
    enterToken: value,
    confirmedAt: { $exists: true },
    stoppedAt: { $exists: false },
  });
  if (!watcher) {
    logEvent("watch_enter_rejected");
    return null;
  }
  logEvent("watch_entered");
  return { email: watcher.email };
}

// Rows from before the enter link existed have no token; mint one the first time they are
// about to be mailed, so every alert carries a working door.
async function ensureEnterTokens(watchers: IWatcher[]): Promise<void> {
  const missing = watchers.filter((watcher) => !watcher.enterToken);
  if (missing.length === 0) return;
  for (const watcher of missing) watcher.enterToken = token();
  await Watcher.bulkWrite(
    missing.map((watcher) => ({
      updateOne: { filter: { _id: watcher._id }, update: { $set: { enterToken: watcher.enterToken } } },
    }))
  );
}

/**
 * Takes an address off the list. Deliberately gives no sign of whether the token matched:
 * an unknown or already-spent token gets the same "you're not watching" answer, so the link
 * is safe to click twice and useless for probing who is on the list.
 */
export async function stop(value: string): Promise<void> {
  await dbConnect();
  const result = await Watcher.updateOne(
    { stopToken: value, stoppedAt: { $exists: false } },
    { $set: { stoppedAt: new Date() }, $unset: { confirmToken: "" } }
  );
  logEvent("watch_stopped", { matched: result.matchedCount });
}

/** How many addresses would get the next alert. Shown on the page, so it has to be this
    exact predicate and not a count of rows. */
export async function countWaiting(): Promise<number> {
  await dbConnect();
  return Watcher.countDocuments({ confirmedAt: { $exists: true }, stoppedAt: { $exists: false } });
}

/** Whether one address is on the list, for a signed-in visitor who already joined. */
export async function isWatching(email: string): Promise<boolean> {
  await dbConnect();
  return Boolean(
    await Watcher.exists({ email: email.toLowerCase(), confirmedAt: { $exists: true }, stoppedAt: { $exists: false } })
  );
}

/**
 * Tells the list the board has passes again. Called only on the empty-to-not-empty
 * transition, which is the event people signed up for; the per-address cooldown is the
 * second guard, in case that transition happens twice in a day.
 *
 * Swallows its own failures for the same reason notifyNewPass does: a mail problem must
 * never cost the submitter their listing.
 */
export async function notifyWatchers(): Promise<number> {
  try {
    await dbConnect();
    const cutoff = new Date(Date.now() - ALERT_COOLDOWN_HOURS * 60 * 60 * 1000);
    const watchers = await Watcher.find({
      confirmedAt: { $exists: true },
      stoppedAt: { $exists: false },
      $or: [{ lastNotifiedAt: { $exists: false } }, { lastNotifiedAt: { $lt: cutoff } }],
    }).limit(MAX_ALERT_RECIPIENTS);
    if (watchers.length === 0) return 0;
    await ensureEnterTokens(watchers);

    const delivered = new Set(
      await sendPassAlerts(
        watchers.map((watcher) => ({
          email: watcher.email,
          enterUrl: enterUrl(watcher.enterToken!),
          stopUrl: stopUrl(watcher.stopToken),
        })),
        watchers.length
      )
    );

    // Only what actually went out is marked sent, so a failed send is retried on the next
    // refill rather than quietly counted as delivered.
    const sent = watchers.filter((watcher) => delivered.has(watcher.email));
    await Watcher.updateMany(
      { _id: { $in: sent.map((watcher) => watcher._id) } },
      { $set: { lastNotifiedAt: new Date() }, $inc: { notifyCount: 1 } }
    );
    logEvent("watch_alerts_sent", {
      recipients: sent.length,
      failed: watchers.length - sent.length,
    });
    return sent.length;
  } catch (error) {
    console.error("Watcher fan-out failed:", error);
    return 0;
  }
}
