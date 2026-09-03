import { Types } from "mongoose";

import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import { UNLOCKS_PER_PASS, WAVE_SIZE, openWaveCount } from "@/lib/passes";
import { sendPassAlerts } from "@/lib/sendgrid";
import { enterUrl, stopUrl } from "@/lib/watchers";
import Counter from "@/models/Counter";
import Pass, { IPass, PASS_STATUS } from "@/models/Pass";
import Watcher, { IWatcher } from "@/models/Watcher";

// The queue. One rule holds the whole thing together: a pass is offered to the front of
// the line first, ten people at a time, and the only event that moves anyone is an unlock
// - the one thing this server can actually see. Whether a link was redeemed on claude.ai
// is invisible to us, so nothing here depends on someone's word for it.

// Three offers ignored and the number goes to the back, so a sleeping front row cannot
// hold up every pass behind it.
const OFFERS_BEFORE_DEMOTION = 3;

// Waves fire as people load the page, and a burst of arrivals must not become a burst of
// duplicate sends, so one advance run has a ceiling.
const MAX_WAVES_PER_RUN = 12;

/** Everyone currently in line: confirmed, not stopped, not already served. */
const ACTIVE = {
  confirmedAt: { $exists: true },
  stoppedAt: { $exists: false },
  leftQueueAt: { $exists: false },
  position: { $exists: true },
} as const;

/** Confirmed and waiting, whether or not the queue has noticed them yet. */
const CONFIRMED = {
  confirmedAt: { $exists: true },
  stoppedAt: { $exists: false },
  leftQueueAt: { $exists: false },
} as const;

async function nextPosition(): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    "queue",
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return counter!.value;
}

/** Hands out a number, once. Called on confirmation and on a rejoin. */
export async function takeNumber(watcherId: Types.ObjectId): Promise<number> {
  const position = await nextPosition();
  await Watcher.updateOne(
    { _id: watcherId },
    { $set: { position, offersSinceUnlock: 0 }, $unset: { leftQueueAt: "" } }
  );
  return position;
}

export async function queueSize(): Promise<number> {
  await dbConnect();
  return Watcher.countDocuments(ACTIVE);
}

export function waveOf(rank: number): number {
  return Math.max(1, Math.ceil(rank / WAVE_SIZE));
}

export interface Standing {
  position: number;
  rank: number; // place in the line right now, after everyone served has left it
  wave: number;
  ahead: number;
}

/**
 * Where one person stands. The rank is not the number: numbers are never reused, so the
 * line shortens under you as people are served, and the rank is what actually decides
 * which wave you are in.
 */
export async function standingFor(email: string): Promise<Standing | null> {
  await dbConnect();
  const watcher = await Watcher.findOne({ email: email.toLowerCase(), ...ACTIVE });
  if (!watcher?.position) return null;
  const ahead = await Watcher.countDocuments({ ...ACTIVE, position: { $lt: watcher.position } });
  const rank = ahead + 1;
  return { position: watcher.position, rank, wave: waveOf(rank), ahead };
}

/** The wave a newcomer would land in if they joined right now. */
export async function waveForNewcomer(): Promise<number> {
  return waveOf((await queueSize()) + 1);
}

/**
 * How many more people can join before a newcomer lands a wave further back. Real
 * scarcity: wave N covers ranks (N-1)*10+1 to N*10, so this is simply what is left of it.
 */
export function spotsLeftInJoinWave(inLine: number): number {
  return waveOf(inLine + 1) * WAVE_SIZE - inLine;
}

/** Numbers handed out in the last day - the pace someone is racing. */
export async function joinedToday(): Promise<number> {
  await dbConnect();
  return Watcher.countDocuments({
    ...ACTIVE,
    confirmedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });
}

/** How many people the queue has served in the last week - the proof that it moves. */
export async function servedThisWeek(): Promise<number> {
  await dbConnect();
  return Watcher.countDocuments({
    leftQueueAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  });
}

/** Their turn has come if the pass has opened as far down the line as they stand. */
export async function mayUnlock(email: string, pass: IPass): Promise<{ ok: boolean; standing: Standing | null }> {
  const standing = await standingFor(email);
  if (!standing) return { ok: false, standing: null };
  const open = openWaveCount(pass.waveStartedAt);
  return { ok: standing.rank <= open * WAVE_SIZE, standing };
}

/** They took their turn. Out of the line, so everyone behind moves up. */
export async function leaveQueue(email: string): Promise<void> {
  const result = await Watcher.updateOne(
    { email: email.toLowerCase(), leftQueueAt: { $exists: false } },
    { $set: { leftQueueAt: new Date(), offersSinceUnlock: 0 } }
  );
  if (result.modifiedCount) logEvent("queue_left", { reason: "unlocked" });
}

/**
 * The link they unlocked was already spent. That is not their fault and it is not a turn
 * taken, so they go back in - at the end, because the number they had is gone.
 */
export async function rejoinAtBack(email: string): Promise<number | null> {
  await dbConnect();
  const watcher = await Watcher.findOne({
    email: email.toLowerCase(),
    confirmedAt: { $exists: true },
    stoppedAt: { $exists: false },
    leftQueueAt: { $exists: true },
  });
  if (!watcher) return null;
  const position = await takeNumber(watcher._id as Types.ObjectId);
  logEvent("queue_rejoined", { reason: "dead_link" });
  return position;
}

/**
 * Reissues the numbers of people who have let three turns go by. Run when a pass is
 * listed, so a demotion never takes effect underneath someone mid-offer.
 */
export async function demoteNoShows(): Promise<number> {
  await dbConnect();
  const sleeping = await Watcher.find({
    ...ACTIVE,
    offersSinceUnlock: { $gte: OFFERS_BEFORE_DEMOTION },
  }).sort({ position: 1 });
  for (const watcher of sleeping) await takeNumber(watcher._id as Types.ObjectId);
  if (sleeping.length) logEvent("queue_demoted", { people: sleeping.length });
  return sleeping.length;
}

/**
 * Sends one wave of one pass. The cursor on the pass is the high-water mark of who has
 * been told, so this walks strictly forward: nobody hears about the same pass twice, and
 * nobody in between is stepped over.
 *
 * Claiming the wave number is the lock. Two page loads in the same second both try, one
 * wins the findOneAndUpdate, the other gets null and does nothing.
 */
async function sendWave(pass: IPass, wave: number): Promise<number> {
  const claimed = await Pass.findOneAndUpdate(
    { _id: pass._id, wavesNotified: wave - 1, status: PASS_STATUS.live },
    { $set: { wavesNotified: wave } },
    { returnDocument: "after" }
  );
  if (!claimed) return 0;

  const batch = await Watcher.find({ ...ACTIVE, position: { $gt: claimed.waveCursor } })
    .sort({ position: 1 })
    .limit(WAVE_SIZE);
  if (batch.length === 0) return 0;

  const delivered = new Set(
    await sendPassAlerts(
      batch.map((watcher) => ({
        email: watcher.email,
        enterUrl: enterUrl(watcher.enterToken!),
        stopUrl: stopUrl(watcher.stopToken),
      })),
      batch.length,
      wave
    )
  );

  // The cursor moves past everyone in the batch whether or not their mail landed: a
  // bouncing address must not pin the queue and re-receive every later wave.
  await Pass.updateOne({ _id: claimed._id }, { $set: { waveCursor: batch[batch.length - 1].position! } });
  const sent = batch.filter((watcher) => delivered.has(watcher.email));
  await Watcher.updateMany(
    { _id: { $in: sent.map((watcher) => watcher._id) } },
    { $set: { lastNotifiedAt: new Date() }, $inc: { notifyCount: 1, offersSinceUnlock: 1 } }
  );
  logEvent("queue_wave_sent", {
    pass: claimed._id.toString(),
    wave,
    recipients: sent.length,
    failed: batch.length - sent.length,
  });
  return sent.length;
}

/**
 * Rows that confirmed before the queue existed hold no number, and every walk in this file
 * goes by number - so they get no alert, no standing on the card, and no unlock, while the
 * list still counts them as members. Nothing else brings them back: takeNumber runs on
 * confirmation and on a rejoin, and neither happens again to someone already confirmed.
 *
 * They are adopted in the order they confirmed, so the line among them is the order they
 * joined it. Numbers already handed out are never touched.
 */
async function adoptUnnumbered(): Promise<number> {
  const unnumbered = await Watcher.find({ ...CONFIRMED, position: { $exists: false } }).sort({
    confirmedAt: 1,
  });
  for (const watcher of unnumbered) await takeNumber(watcher._id as Types.ObjectId);
  if (unnumbered.length) logEvent("queue_adopted", { people: unnumbered.length });
  return unnumbered.length;
}

// Rows from before the enter link existed have no token; mint one before they are mailed.
async function ensureEnterTokens(): Promise<void> {
  const missing = await Watcher.find({ ...ACTIVE, enterToken: { $exists: false } });
  if (missing.length === 0) return;
  const crypto = await import("crypto");
  await Watcher.bulkWrite(
    missing.map((watcher) => ({
      updateOne: {
        filter: { _id: watcher._id },
        update: { $set: { enterToken: crypto.randomBytes(24).toString("hex") } },
      },
    }))
  );
}

/**
 * Opens every wave that is due on every live pass. There is no scheduler here by design:
 * wave 1's recipients arrive on the page within a minute or two, and their requests are
 * what turn the clock for the waves behind them.
 *
 * Swallows its own failures - a mail problem must never cost a submitter their listing or
 * a visitor their page.
 */
export async function advanceWaves(): Promise<number> {
  try {
    await dbConnect();
    // Before the tokens, and before any wave is picked: an unnumbered member is invisible
    // to both, and this is the last moment to notice them without skipping their turn.
    await adoptUnnumbered();
    await ensureEnterTokens();
    const passes = await Pass.find({ status: PASS_STATUS.live }).sort({ waveStartedAt: 1 });
    let sent = 0;
    let runs = 0;

    for (const pass of passes) {
      const due = openWaveCount(pass.waveStartedAt);
      let current = pass;
      while (current.wavesNotified < due && current.unlockCount < UNLOCKS_PER_PASS) {
        if (++runs > MAX_WAVES_PER_RUN) return sent;
        const delivered = await sendWave(current, current.wavesNotified + 1);
        const refreshed = await Pass.findById(current._id);
        if (!refreshed || refreshed.wavesNotified === current.wavesNotified) break;
        current = refreshed;
        sent += delivered;
        // The line ran out before the pass did; later waves have nobody left to reach.
        if (delivered === 0 && refreshed.waveCursor >= (await highestPosition())) break;
      }
    }
    return sent;
  } catch (error) {
    console.error("Wave advance failed:", error);
    return 0;
  }
}

async function highestPosition(): Promise<number> {
  const last = await Watcher.find(ACTIVE).sort({ position: -1 }).limit(1);
  return last[0]?.position ?? 0;
}

/** For the dashboard and the card: who is in the line, in order. */
export async function frontOfQueue(limit = WAVE_SIZE): Promise<IWatcher[]> {
  await dbConnect();
  return Watcher.find(ACTIVE).sort({ position: 1 }).limit(limit);
}
