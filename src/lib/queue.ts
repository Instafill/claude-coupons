import { Types } from "mongoose";

import { DEFAULT_DEAL, DealSlug } from "@/lib/deals";
import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import { WAVE_MINUTES, WAVE_SIZE, dealOf, openWaveCount } from "@/lib/passes";
import { sendPassAlerts } from "@/lib/sendgrid";
import { enterUrl, stopUrl } from "@/lib/watchers";
import Counter from "@/models/Counter";
import Membership from "@/models/Membership";
import Pass, { IPass, PASS_STATUS } from "@/models/Pass";
import Watcher, { IWatcher } from "@/models/Watcher";

// The queue. One rule holds the whole thing together: a listing is offered to the front of
// its own line first, ten people at a time, and the only event that moves anyone is an
// unlock - the one thing this server can actually see. Whether a code was redeemed inside
// the brand's app is invisible to us, so nothing here depends on someone's word for it.
//
// One line per board. Somebody waiting for a Claude pass has not been waiting for a Waymo
// code, and unlocking one must not cost them the other: every walk below is scoped to a
// single deal, and a person holds an independent number on each board they joined.

// Three offers ignored and the number goes to the back, so a sleeping front row cannot
// hold up every listing behind it.
const OFFERS_BEFORE_DEMOTION = 3;

// Waves fire as people load the page, and a burst of arrivals must not become a burst of
// duplicate sends, so one advance run has a ceiling.
//
// The ceiling is per board, not per run. A single shared budget would be one queue's
// backlog spending another queue's turn: listings are walked oldest first across every
// board, so a busy Claude board would use the whole allowance and leave Waymo's waves
// unopened until the next poll. Each board gets its own count and its own exhaustion.
const MAX_WAVES_PER_RUN = 12;

// Two listings on one board within a minute walk the same front row, and the alert is
// "come to the board" - the board shows every live listing, so a second mail inside one
// wave period says nothing new and its charged offer burns a turn nobody really got.
// Anyone alerted more recently than this is passed over: the cursor still moves so this
// listing never revisits them, but no mail goes out and no offer is charged.
//
// Counted per board, because an alert about Uber says nothing about the Claude pass
// somebody is actually waiting for.
const ALERT_COOLDOWN_MS = WAVE_MINUTES * 60 * 1000;

/** Everyone currently in one line: not stopped, not already served. */
function active(deal: DealSlug) {
  return {
    deal,
    stoppedAt: { $exists: false },
    leftQueueAt: { $exists: false },
  } as const;
}

/**
 * The counter a board's numbers come from.
 *
 * Claude's is still called "queue" with no suffix. That is not tidiness lost: it is the
 * counter that has been handing out numbers since before there were boards, and renaming
 * it would restart Claude's line at 1 underneath everyone already holding a number.
 */
function counterId(deal: DealSlug): string {
  return deal === DEFAULT_DEAL ? "queue" : `queue:${deal}`;
}

async function nextPosition(deal: DealSlug): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    counterId(deal),
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return counter!.value;
}

/**
 * Hands out a number on one board, once. Called when someone joins it, and on a rejoin.
 * Upserts, so joining a board a second time moves the one row rather than adding another.
 */
export async function takeNumber(
  watcherId: Types.ObjectId,
  email: string,
  deal: DealSlug
): Promise<number> {
  const position = await nextPosition(deal);
  await Membership.updateOne(
    { email: email.toLowerCase(), deal },
    {
      $set: { watcherId, position, offersSinceUnlock: 0 },
      $unset: { leftQueueAt: "", stoppedAt: "" },
      $setOnInsert: { notifyCount: 0 },
    },
    { upsert: true }
  );
  return position;
}

/** Their place on a board, taken only if they do not already hold one there. */
export async function joinQueue(
  watcherId: Types.ObjectId,
  email: string,
  deal: DealSlug
): Promise<number> {
  await dbConnect();
  const existing = await Membership.findOne({ email: email.toLowerCase(), deal });
  if (existing && !existing.stoppedAt) return existing.position;
  if (existing) {
    // Stopped and come back: the number they had is still theirs, and the line has moved
    // on without them anyway, so reviving the row is fairer than sending them to the back.
    await Membership.updateOne({ _id: existing._id }, { $unset: { stoppedAt: "" } });
    return existing.position;
  }
  return takeNumber(watcherId, email, deal);
}

/** Every board an address stopped hearing about, in step with the watcher's own stop. */
export async function stopMemberships(email: string): Promise<void> {
  await Membership.updateMany(
    { email: email.toLowerCase(), stoppedAt: { $exists: false } },
    { $set: { stoppedAt: new Date() } }
  );
}

export async function queueSize(deal: DealSlug): Promise<number> {
  await dbConnect();
  return Membership.countDocuments(active(deal));
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
 * Where one person stands on one board. The rank is not the number: numbers are never
 * reused, so the line shortens under you as people are served, and the rank is what
 * actually decides which wave you are in.
 */
export async function standingFor(
  email: string,
  deal: DealSlug
): Promise<Standing | null> {
  await dbConnect();
  const member = await Membership.findOne({ email: email.toLowerCase(), ...active(deal) });
  if (!member) return null;
  const ahead = await Membership.countDocuments({
    ...active(deal),
    position: { $lt: member.position },
  });
  const rank = ahead + 1;
  return { position: member.position, rank, wave: waveOf(rank), ahead };
}

/** Where someone stands on every board they joined - for the dashboard. */
export async function standingsFor(email: string): Promise<Map<string, Standing>> {
  await dbConnect();
  const members = await Membership.find({
    email: email.toLowerCase(),
    stoppedAt: { $exists: false },
    leftQueueAt: { $exists: false },
  });
  const standings = new Map<string, Standing>();
  for (const member of members) {
    const standing = await standingFor(email, member.deal);
    if (standing) standings.set(member.deal, standing);
  }
  return standings;
}

/** The wave a newcomer would land in if they joined this board right now. */
export async function waveForNewcomer(deal: DealSlug): Promise<number> {
  return waveOf((await queueSize(deal)) + 1);
}

/**
 * How many more people can join before a newcomer lands a wave further back. Real
 * scarcity: wave N covers ranks (N-1)*10+1 to N*10, so this is simply what is left of it.
 */
export function spotsLeftInJoinWave(inLine: number): number {
  return waveOf(inLine + 1) * WAVE_SIZE - inLine;
}

/** Numbers handed out on this board in the last day - the pace someone is racing. */
export async function joinedToday(deal: DealSlug): Promise<number> {
  await dbConnect();
  return Membership.countDocuments({
    ...active(deal),
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });
}

/** How many people this board has served in the last week - the proof that it moves. */
export async function servedThisWeek(deal: DealSlug): Promise<number> {
  await dbConnect();
  return Membership.countDocuments({
    deal,
    leftQueueAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  });
}

/** Their turn has come if the listing has opened as far down its line as they stand. */
export async function mayUnlock(
  email: string,
  pass: IPass
): Promise<{ ok: boolean; standing: Standing | null }> {
  const standing = await standingFor(email, dealOf(pass).slug);
  if (!standing) return { ok: false, standing: null };
  const open = openWaveCount(pass.waveStartedAt);
  return { ok: standing.rank <= open * WAVE_SIZE, standing };
}

/** They took their turn on this board. Out of that line; everyone behind moves up. */
export async function leaveQueue(email: string, deal: DealSlug): Promise<void> {
  const result = await Membership.updateOne(
    { email: email.toLowerCase(), deal, leftQueueAt: { $exists: false } },
    { $set: { leftQueueAt: new Date(), offersSinceUnlock: 0 } }
  );
  if (result.modifiedCount) logEvent("queue_left", { deal, reason: "unlocked" });
}

/**
 * The code they unlocked was already spent. That is not their fault and it is not a turn
 * taken, so they go back in - at the end, because the number they had is gone.
 */
export async function rejoinAtBack(email: string, deal: DealSlug): Promise<number | null> {
  await dbConnect();
  const member = await Membership.findOne({
    email: email.toLowerCase(),
    deal,
    stoppedAt: { $exists: false },
    leftQueueAt: { $exists: true },
  });
  if (!member) return null;
  const position = await takeNumber(member.watcherId, member.email, deal);
  logEvent("queue_rejoined", { deal, reason: "dead_link" });
  return position;
}

/**
 * Reissues the numbers of people who have let three turns go by on one board. Run when a
 * listing is added there, so a demotion never takes effect underneath someone mid-offer.
 */
export async function demoteNoShows(deal: DealSlug): Promise<number> {
  await dbConnect();
  const sleeping = await Membership.find({
    ...active(deal),
    offersSinceUnlock: { $gte: OFFERS_BEFORE_DEMOTION },
  }).sort({ position: 1 });
  for (const member of sleeping) await takeNumber(member.watcherId, member.email, deal);
  if (sleeping.length) logEvent("queue_demoted", { deal, people: sleeping.length });
  return sleeping.length;
}

/**
 * Sends one wave of one listing. The cursor on the listing is the high-water mark of who
 * has been told, so this walks strictly forward: nobody hears about the same listing twice,
 * and nobody in between is stepped over.
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

  const deal = dealOf(claimed);
  const batch = await Membership.find({
    ...active(deal.slug),
    position: { $gt: claimed.waveCursor },
  })
    .sort({ position: 1 })
    .limit(WAVE_SIZE);
  if (batch.length === 0) return 0;

  // Best effort, not an invariant: the per-listing claim above still lets two listings on
  // one board advance in the same instant, but waves claim seconds apart in practice and
  // each send stamps lastNotifiedAt before the next wave reads it.
  const cutoff = new Date(Date.now() - ALERT_COOLDOWN_MS);
  const fresh = batch.filter((m) => !m.lastNotifiedAt || m.lastNotifiedAt < cutoff);

  // The tokens live on the watcher, not the membership: one address, one way in and one
  // way out, however many boards it is waiting on.
  const watchers = await Watcher.find({ email: { $in: fresh.map((m) => m.email) } });
  const byEmail = new Map(watchers.map((w) => [w.email, w]));
  await ensureEnterTokens(watchers);

  const recipients = fresh.flatMap((member) => {
    const watcher = byEmail.get(member.email);
    if (!watcher?.enterToken) return [];
    return [
      {
        email: member.email,
        enterUrl: enterUrl(watcher.enterToken, deal.slug),
        stopUrl: stopUrl(watcher.stopToken),
      },
    ];
  });

  const delivered = new Set(
    recipients.length
      ? await sendPassAlerts(recipients, deal, batch.length, wave)
      : []
  );

  // The cursor moves past everyone in the batch whether or not their mail landed: a
  // bouncing address must not pin the queue and re-receive every later wave.
  await Pass.updateOne(
    { _id: claimed._id },
    { $set: { waveCursor: batch[batch.length - 1].position } }
  );
  const sent = fresh.filter((member) => delivered.has(member.email));
  await Membership.updateMany(
    { _id: { $in: sent.map((member) => member._id) } },
    { $set: { lastNotifiedAt: new Date() }, $inc: { notifyCount: 1, offersSinceUnlock: 1 } }
  );
  logEvent("queue_wave_sent", {
    deal: deal.slug,
    pass: claimed._id.toString(),
    wave,
    recipients: sent.length,
    skipped: batch.length - fresh.length,
    failed: fresh.length - sent.length,
  });
  return sent.length;
}

/**
 * Brings the rows that predate the Membership collection into it, and picks up anyone the
 * queue never noticed.
 *
 * Two kinds of row. Most hold a Claude queue number on the watcher itself, from when there
 * was one board and the number could live there; their place is copied across intact,
 * along with how many offers they had let go and when they were last mailed, so nobody
 * loses a turn they have been waiting for. A few confirmed before the queue existed at all
 * and hold no number; they are adopted in the order they confirmed, which is the order
 * they joined the line.
 *
 * Stamping queueMigratedAt is what makes this free after the first run: the query that
 * finds the work is the one that proves there is none left. Called before every wave
 * advance and before every board renders someone's standing, because a member the queue
 * cannot see is a member whose turn is about to be skipped.
 */
export async function ensureQueueAdopted(): Promise<number> {
  await dbConnect();
  const legacy = await Watcher.find({
    confirmedAt: { $exists: true },
    stoppedAt: { $exists: false },
    queueMigratedAt: { $exists: false },
  }).sort({ confirmedAt: 1 });
  if (legacy.length === 0) return 0;

  for (const watcher of legacy) {
    const id = watcher._id as Types.ObjectId;
    const existing = await Membership.findOne({ email: watcher.email, deal: DEFAULT_DEAL });
    if (!existing) {
      if (watcher.position) {
        await Membership.create({
          watcherId: id,
          email: watcher.email,
          deal: DEFAULT_DEAL,
          position: watcher.position,
          leftQueueAt: watcher.leftQueueAt,
          offersSinceUnlock: watcher.offersSinceUnlock ?? 0,
          lastNotifiedAt: watcher.lastNotifiedAt,
          notifyCount: watcher.notifyCount ?? 0,
        });
      } else {
        await takeNumber(id, watcher.email, DEFAULT_DEAL);
      }
    }
    await Watcher.updateOne({ _id: id }, { $set: { queueMigratedAt: new Date() } });
  }
  logEvent("queue_adopted", { people: legacy.length });
  return legacy.length;
}

// Rows from before the enter link existed have no token; mint one before they are mailed.
async function ensureEnterTokens(watchers: IWatcher[]): Promise<void> {
  const missing = watchers.filter((watcher) => !watcher.enterToken);
  if (missing.length === 0) return;
  const crypto = await import("crypto");
  for (const watcher of missing) {
    watcher.enterToken = crypto.randomBytes(24).toString("hex");
  }
  await Watcher.bulkWrite(
    missing.map((watcher) => ({
      updateOne: {
        filter: { _id: watcher._id },
        update: { $set: { enterToken: watcher.enterToken } },
      },
    }))
  );
}

/**
 * Opens every wave that is due, on every live listing of every board. There is no
 * scheduler here by design: wave 1's recipients arrive on the page within a minute or two,
 * and their requests are what turn the clock for the waves behind them.
 *
 * Swallows its own failures - a mail problem must never cost a submitter their listing or
 * a visitor their page.
 */
export async function advanceWaves(): Promise<number> {
  try {
    await dbConnect();
    await ensureQueueAdopted();
    const passes = await Pass.find({ status: PASS_STATUS.live }).sort({ waveStartedAt: 1 });
    let sent = 0;
    const runs = new Map<DealSlug, number>();

    for (const pass of passes) {
      const deal = dealOf(pass).slug;
      // Spent its own board's allowance. Continue rather than return: the boards after
      // this one have their own, and abandoning the walk would let one busy queue hold up
      // every other queue's waves for the next thirty seconds.
      if ((runs.get(deal) ?? 0) >= MAX_WAVES_PER_RUN) continue;

      const due = openWaveCount(pass.waveStartedAt);
      const limit = dealOf(pass).unlocksPerListing;
      let current = pass;
      while (current.wavesNotified < due && current.unlockCount < limit) {
        const spent = runs.get(deal) ?? 0;
        if (spent >= MAX_WAVES_PER_RUN) break;
        runs.set(deal, spent + 1);

        const delivered = await sendWave(current, current.wavesNotified + 1);
        const refreshed = await Pass.findById(current._id);
        if (!refreshed || refreshed.wavesNotified === current.wavesNotified) break;
        current = refreshed;
        sent += delivered;
        // The line ran out before the listing did; later waves have nobody left to reach.
        if (delivered === 0 && refreshed.waveCursor >= (await highestPosition(deal))) break;
      }
    }
    return sent;
  } catch (error) {
    console.error("Wave advance failed:", error);
    return 0;
  }
}

async function highestPosition(deal: DealSlug): Promise<number> {
  const last = await Membership.find(active(deal)).sort({ position: -1 }).limit(1);
  return last[0]?.position ?? 0;
}
