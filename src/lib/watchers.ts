import crypto from "crypto";
import { Types } from "mongoose";

import { DEFAULT_DEAL, DealSlug, getDeal } from "@/lib/deals";
import { logEvent } from "@/lib/events";
import { Geo } from "@/lib/geo";
import { dbConnect } from "@/lib/mongodb";
import { SITE_URL } from "@/lib/seo";
import { sendWatchConfirmation } from "@/lib/sendgrid";
import Watcher, { WatchIntent } from "@/models/Watcher";

// The watch list: everything that decides whether an address is on it, and everything that
// decides whether it receives mail. The routes below this only translate HTTP into these
// calls, so the rules live in one readable place.
//
// One row per address, however many boards it watches. The address is the identity - it is
// what a confirmation proves and what a stop link silences - so the boards someone is
// waiting on hang off it as Membership rows rather than multiplying it.

export const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// A confirmation link is useless after this long - by then the empty board that prompted it
// has almost certainly refilled and emptied again.
const CONFIRM_WINDOW_DAYS = 7;
// Asking twice in quick succession sends one email, not two.
const RESEND_COOLDOWN_MINUTES = 10;
// Bounds how many strangers one connection can put a confirmation request in front of.
const CONFIRMATIONS_PER_IP_PER_DAY = 5;

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

/** The button in an alert. It carries the board the alert was about, so someone watching
    two of them lands on the one that just filled rather than on the home page. */
export function enterUrl(value: string, deal?: DealSlug): string {
  const board = deal && deal !== DEFAULT_DEAL ? `&deal=${deal}` : "";
  return `${baseUrl()}/api/watch/enter?token=${value}${board}`;
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
  /** The board they are joining. One submit, one queue - the form they used says which. */
  deal: DealSlug;
  intent?: WatchIntent;
  geo?: Geo;
}): Promise<{ watching: boolean }> {
  await dbConnect();
  const now = new Date();
  const existing = await Watcher.findOne({ email: input.email });
  const { joinQueue } = await import("@/lib/queue");

  // What they answered, in the shape the row stores it. Absent answers stay absent rather
  // than blanking an earlier one.
  const answers: Record<string, unknown> = {};
  if (input.intent) answers.intent = input.intent;
  // Refreshed on every subscribe: people move, and the last place we saw them is more
  // useful than the first. Absent fields are left alone rather than blanking what we had.
  for (const [field, value] of Object.entries(input.geo ?? {})) {
    if (value) answers[field] = value;
  }

  // Already watching: the address is proven, so a second confirmation would be theatre.
  // The board they just asked for is new information though - somebody waiting on Claude
  // passes who now also wants Waymo codes gets their number on that line immediately, with
  // no email in between.
  if (existing?.confirmedAt && !existing.stoppedAt) {
    if (Object.keys(answers).length) {
      await Watcher.updateOne({ _id: existing._id }, { $set: answers });
    }
    await joinQueue(existing._id as Types.ObjectId, existing.email, input.deal);
    return { watching: true };
  }

  // queueMigratedAt is stamped at creation, not because anything has been migrated, but
  // because it marks a row whose queue places already live in the Membership collection.
  // Without it the adoption pass would treat a brand-new Waymo subscriber as a legacy
  // Claude one and hand them a number in a line they never asked to stand in.
  const watcher =
    existing ?? new Watcher({ email: input.email, stopToken: token(), queueMigratedAt: new Date() });
  // Re-subscribing after stopping reuses the row - the unique index on email means there is
  // only ever one, and the stop token stays valid so old alerts keep working.
  watcher.stoppedAt = undefined;
  watcher.ipHash = input.ipHash;
  if (input.userId) watcher.userId = new Types.ObjectId(input.userId);
  watcher.set(answers);

  if (input.preVerified) {
    watcher.confirmedAt = now;
    watcher.confirmToken = undefined;
    watcher.pendingDeals = undefined;
    watcher.queueMigratedAt = watcher.queueMigratedAt ?? new Date();
    await watcher.save();
    // Their place in line is the whole product, so it is handed out the moment they are in.
    await joinQueue(watcher._id as Types.ObjectId, watcher.email, input.deal);
    logEvent("watch_confirmed", { via: "session", deal: input.deal });
    return { watching: true };
  }

  // Unproven, so nothing is joined yet: the board they asked for is remembered on the row
  // and acted on when the link in the mail is clicked. A place in line is only ever handed
  // to an address someone has shown they can read.
  watcher.pendingDeals = [input.deal];

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
  await sendWatchConfirmation(
    watcher.email,
    getDeal(input.deal),
    confirmUrl(watcher.confirmToken)
  );
  logEvent("watch_subscribed", { deal: input.deal, returning: Boolean(existing) });
  return { watching: false };
}

/**
 * Records where someone is, on any request that already knows who they are.
 *
 * There is no way to place the people who joined before this was captured: the IP that
 * implies a location is hashed on arrival and never stored, the event log deliberately holds
 * no address to join on, and analytics only counts countries in aggregate. So the list fills
 * in as people come back - a confirmation click, an alert link, a board left open.
 *
 * The filter is the point: an unchanged location matches nothing and writes nothing, which
 * matters because the board polls every thirty seconds from every open tab.
 */
export async function placeWatcher(email: string, geo: Geo): Promise<void> {
  const fields = Object.fromEntries(Object.entries(geo).filter(([, value]) => value));
  if (!Object.keys(fields).length) return;
  await dbConnect();
  await Watcher.updateOne(
    {
      email: email.toLowerCase(),
      $or: [
        { country: { $exists: false } },
        { country: { $ne: geo.country } },
        // Only when we have one to compare: a $ne against undefined would match every row
        // that has a city and write on every poll.
        ...(geo.city ? [{ city: { $ne: geo.city } }] : []),
      ],
    },
    { $set: fields }
  );
}

/**
 * Spends a confirmation token. Clearing it is what makes a replayed link find nothing.
 * Returns the address so the caller can start its session: clicking the link proved the
 * mailbox, which is exactly what a magic link proves, and the list is the door.
 */
export async function confirm(
  value: string
): Promise<{ email: string; deal: DealSlug } | null> {
  await dbConnect();
  const cutoff = new Date(Date.now() - CONFIRM_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const before = await Watcher.findOne({ confirmToken: value, confirmSentAt: { $gte: cutoff } });
  const watcher = await Watcher.findOneAndUpdate(
    { confirmToken: value, confirmSentAt: { $gte: cutoff } },
    // Clearing stoppedAt too: confirming is an unambiguous "yes", so it revives a row that
    // someone stopped and then signed up for again.
    {
      $set: { confirmedAt: new Date(), queueMigratedAt: new Date() },
      $unset: { confirmToken: "", stoppedAt: "", pendingDeals: "" },
    },
    { returnDocument: "after" }
  );
  if (!watcher) {
    logEvent("watch_confirm_rejected");
    return null;
  }
  // What they asked for before the link was clicked. A row that predates the field is a
  // Claude subscriber, which is what everyone on the list was at the time.
  const deals = before?.pendingDeals?.length ? before.pendingDeals : [DEFAULT_DEAL];
  // Only the boards they asked for are revived. A stop meant every board, so bringing all
  // of them back on a confirmation for one would put mail in an inbox that did not ask for
  // it - joinQueue lifts the stop on exactly the line being joined.
  const { joinQueue } = await import("@/lib/queue");
  for (const deal of deals) {
    await joinQueue(watcher._id as Types.ObjectId, watcher.email, deal);
  }
  logEvent("watch_confirmed", { via: "email", deal: deals[0] });
  return { email: watcher.email, deal: deals[0] };
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

/**
 * Takes an address off the list. Deliberately gives no sign of whether the token matched:
 * an unknown or already-spent token gets the same "you're not watching" answer, so the link
 * is safe to click twice and useless for probing who is on the list.
 */
export async function stop(value: string): Promise<void> {
  await dbConnect();
  const watcher = await Watcher.findOneAndUpdate(
    { stopToken: value, stoppedAt: { $exists: false } },
    { $set: { stoppedAt: new Date() }, $unset: { confirmToken: "" } }
  );
  // One click, every board. A stop link that silenced only the queue whose alert it rode in
  // on would leave someone still receiving mail from us, which is not what the word means.
  if (watcher) {
    const { stopMemberships } = await import("@/lib/queue");
    await stopMemberships(watcher.email);
  }
  logEvent("watch_stopped", { matched: watcher ? 1 : 0 });
}
