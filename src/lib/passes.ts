import crypto from "crypto";
import { Types } from "mongoose";

import {
  DEFAULT_DEAL,
  Deal,
  DealSlug,
  dealDisplay,
  dealLink,
  getDeal,
} from "@/lib/deals";
import { dbConnect } from "@/lib/mongodb";
import Pass, { IPass, PASS_STATUS } from "@/models/Pass";
import Unlock, { IUnlock, UNLOCK_OUTCOME, UnlockOutcome } from "@/models/Unlock";

// The board, for any one deal. How many people a listing may be offered to is the brand's
// own number and lives in lib/deals.ts - Claude's three passes, Waymo's ten monthly uses,
// muse.ai's thirty - so nothing here knows a brand by name.
//
// Unlocks, not claims: whether someone redeemed a code inside the brand's app is invisible
// to us and always will be, so the lifecycle turns on the one thing this server observes.

// The queue is offered a listing ten people at a time, five minutes apart. Wave 1 is open
// the moment it is listed; wave 2 five minutes later, and so on until it runs out. Shared
// by every board: the wave is a property of the queue, not of the brand.
export const WAVE_SIZE = 10;
export const WAVE_MINUTES = 5;
const DEAD_REPORTS_TO_HIDE = 2;
const LISTING_LIFETIME_DAYS = 21;

// Anti-hoarding: how many distinct listings one account may unlock per rolling day, counted
// per board, so a run on Waymo codes does not spend someone's Claude allowance.
export const UNLOCKS_PER_USER_PER_DAY = 3;

// Anonymous submissions are checked for obvious attempts to spell profanity inside an
// otherwise valid token. Normalizing common character substitutions is what catches them.
const BLOCKED_CODE_WORDS = [
  "bitch",
  "cock",
  "cunt",
  "dick",
  "fagg",
  "fuck",
  "nigg",
  "pussy",
  "rape",
  "shit",
  "slut",
  "whore",
];

function normalizedCodeText(code: string): string {
  return code
    .toLowerCase()
    .replaceAll("0", "o")
    .replaceAll("1", "i")
    .replaceAll("3", "e")
    .replaceAll("4", "a")
    .replaceAll("5", "s")
    .replaceAll("7", "t")
    .replaceAll("$", "s")
    .replaceAll("@", "a")
    .replace(/[^a-z]/g, "");
}

export function containsBlockedCodeWord(code: string): boolean {
  const normalized = normalizedCodeText(code);
  return BLOCKED_CODE_WORDS.some((word) => normalized.includes(word));
}

/** The deal a stored row belongs to. Rows written before there were several carry none. */
export function dealOf(pass: Pick<IPass, "deal">): Deal {
  return getDeal(pass.deal ?? DEFAULT_DEAL);
}

// What the board shows before an unlock: enough to look real, not enough to use.
export function maskCode(code: string): string {
  if (code.length <= 5) return `${code.slice(0, 1)}•••`;
  return code.slice(0, 3) + "•".repeat(code.length - 5) + code.slice(-2);
}

export function hashIp(ip: string | null): string {
  const salt = process.env.IP_HASH_SALT || "claudecoupons";
  return crypto.createHash("sha256").update(salt + (ip ?? "")).digest("hex").slice(0, 16);
}

export interface BoardPass {
  id: string;
  code: string | null; // present only when this viewer has unlocked it
  /** What the card prints: the brand's URL shape around the code, or the bare code. */
  display: string;
  /** Where "open it" goes once unlocked. Null until then. */
  url: string | null;
  maskedCode: string;
  unlockCount: number;
  createdAt: string;
  unlockedOutcome: UnlockOutcome | null;
  /** Waves open on this listing right now. Everyone up to openWave * WAVE_SIZE may unlock. */
  openWave: number;
  /** Seconds until the next wave opens, for the countdown on the card. */
  nextWaveInSeconds: number;
}

/** How many waves a listing has opened by now. Pure arithmetic on the listing time. */
export function openWaveCount(waveStartedAt: Date, now: Date = new Date()): number {
  const elapsed = now.getTime() - waveStartedAt.getTime();
  return Math.max(1, Math.floor(elapsed / (WAVE_MINUTES * 60 * 1000)) + 1);
}

export function secondsToNextWave(waveStartedAt: Date, now: Date = new Date()): number {
  const period = WAVE_MINUTES * 60 * 1000;
  const elapsed = Math.max(0, now.getTime() - waveStartedAt.getTime());
  return Math.ceil((period - (elapsed % period)) / 1000);
}

/** How many people this listing has left to serve. The brand's own number, from deals.ts. */
export function unlocksLeft(pass: IPass): number {
  return dealOf(pass).unlocksPerListing - pass.unlockCount;
}

// The hiding rules, evaluated lazily on read. Writes back only on a transition, so the
// board self-maintains without a cron job.
function nextStatus(pass: IPass): string | null {
  if (pass.status !== PASS_STATUS.live) return null;
  if (pass.unlockCount >= dealOf(pass).unlocksPerListing) return PASS_STATUS.exhausted;
  if (pass.deadCount >= DEAD_REPORTS_TO_HIDE && pass.deadCount > pass.claimedCount)
    // Hidden either way, but the label matters: "dead" accuses the submitter of listing a
    // broken code. One somebody has actually claimed demonstrably worked, so later dead
    // reports mean the allotment ran out - latecomers cannot tell "used up" from "fake".
    // Without this, every generous submitter ends up marked as having posted junk.
    return pass.claimedCount > 0 ? PASS_STATUS.exhausted : PASS_STATUS.dead;
  const cutoff = Date.now() - LISTING_LIFETIME_DAYS * 24 * 60 * 60 * 1000;
  if (pass.lastRefreshedAt.getTime() < cutoff) return PASS_STATUS.expired;
  return null;
}

/** Every live listing on one board, retiring the ones whose rules have caught up with them. */
async function liveFor(deal: DealSlug): Promise<IPass[]> {
  await dbConnect();
  const passes = await Pass.find({ status: PASS_STATUS.live, ...dealFilter(deal) });

  const live: IPass[] = [];
  for (const pass of passes) {
    const next = nextStatus(pass);
    if (next) {
      await Pass.updateOne({ _id: pass._id }, { $set: { status: next } });
      continue;
    }
    live.push(pass);
  }
  return live;
}

/**
 * Matching one board's rows, including the ones written before the field existed.
 *
 * Every pass listed before this site had more than one board is a Claude pass and carries
 * no `deal` at all, so Claude's filter has to mean "claude, or nothing" - a plain equality
 * would empty the home page the moment this ships.
 */
export function dealFilter(deal: DealSlug): Record<string, unknown> {
  return deal === DEFAULT_DEAL
    ? { $or: [{ deal: DEFAULT_DEAL }, { deal: { $exists: false } }] }
    : { deal };
}

// The public board: live listings, least-unlocked first so fresh allotments surface.
// A signed-in viewer sees the codes they already unlocked revealed in place.
export async function getBoard(
  deal: DealSlug,
  userId: string | null
): Promise<BoardPass[]> {
  const live = await liveFor(deal);
  const brand = getDeal(deal);

  const unlocks = userId
    ? await Unlock.find({ userId: new Types.ObjectId(userId) })
    : [];
  const mine = new Map(unlocks.map((u) => [u.passId.toString(), u]));

  const now = new Date();
  return live
    .sort(
      (a, b) =>
        a.unlockCount - b.unlockCount ||
        b.createdAt.getTime() - a.createdAt.getTime()
    )
    .map((pass) => {
      const unlock = mine.get(pass._id.toString());
      return {
        id: pass._id.toString(),
        code: unlock ? pass.code : null,
        display: unlock
          ? dealDisplay(brand, pass.code)
          : dealDisplay(brand, maskCode(pass.code)),
        url: unlock ? dealLink(brand, pass.code) : null,
        maskedCode: maskCode(pass.code),
        unlockCount: pass.unlockCount,
        createdAt: pass.createdAt.toISOString(),
        unlockedOutcome: unlock ? unlock.outcome : null,
        openWave: openWaveCount(pass.waveStartedAt, now),
        nextWaveInSeconds: secondsToNextWave(pass.waveStartedAt, now),
      };
    });
}

// How many listings a visitor would actually see right now. Deliberately not a
// countDocuments on status alone: nextStatus() retires exhausted, dead and expired
// listings lazily on read, so a row can still say "live" in Mongo while the board renders
// empty. Filtering through the same predicate - rather than restating its rules as a query
// - is what keeps this answer and getBoard's in agreement.
export async function countLivePasses(deal: DealSlug): Promise<number> {
  return (await liveFor(deal)).length;
}

/** The same count for every board at once, for the hub page and the header. */
export async function countLivePassesByDeal(): Promise<Record<string, number>> {
  await dbConnect();
  const passes = await Pass.find({ status: PASS_STATUS.live });
  const counts: Record<string, number> = {};
  for (const pass of passes) {
    if (nextStatus(pass)) continue;
    const slug = pass.deal ?? DEFAULT_DEAL;
    counts[slug] = (counts[slug] ?? 0) + 1;
  }
  return counts;
}

export async function countRecentUnlocks(
  userId: string,
  deal: DealSlug
): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return Unlock.countDocuments({
    userId: new Types.ObjectId(userId),
    createdAt: { $gt: cutoff },
    ...dealFilter(deal),
  });
}

// Idempotent: a second unlock of the same listing returns the existing row and neither
// bumps the counter nor spends another slot of the daily cap.
export async function recordUnlock(
  passId: string,
  userId: string,
  deal: DealSlug,
  ipHash: string
): Promise<IUnlock> {
  const filter = {
    passId: new Types.ObjectId(passId),
    userId: new Types.ObjectId(userId),
  };
  const existing = await Unlock.findOne(filter);
  if (existing) return existing;

  const unlock = await Unlock.findOneAndUpdate(
    filter,
    { $setOnInsert: { ...filter, deal, ipHash, outcome: UNLOCK_OUTCOME.none } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await Pass.updateOne({ _id: filter.passId }, { $inc: { unlockCount: 1 } });
  return unlock;
}

// Records the "did it work?" answer on the caller's own unlock, once. The listing's
// counters move with it, which is what eventually hides it.
export async function recordOutcome(
  passId: string,
  userId: string,
  outcome: string
): Promise<boolean> {
  if (outcome !== UNLOCK_OUTCOME.claimed && outcome !== UNLOCK_OUTCOME.dead) return false;

  const updated = await Unlock.findOneAndUpdate(
    {
      passId: new Types.ObjectId(passId),
      userId: new Types.ObjectId(userId),
      outcome: UNLOCK_OUTCOME.none,
    },
    { $set: { outcome, outcomeAt: new Date() } }
  );
  if (!updated) return false;

  const field = outcome === UNLOCK_OUTCOME.claimed ? "claimedCount" : "deadCount";
  await Pass.updateOne({ _id: new Types.ObjectId(passId) }, { $inc: { [field]: 1 } });
  return true;
}

export interface ClaimSpeed {
  sample: number; // listings in the window that were unlocked at all
  medianMinutes: number;
}

const SPEED_WINDOW_DAYS = 30;
const SPEED_MIN_SAMPLE = 3;

// How long a listing typically stays unclaimed: the median gap between it being listed and
// its first unlock, over the last 30 days. Median rather than mean, so one listing that sat
// overnight cannot turn "minutes" into "hours"; null under three data points, so the page
// says nothing rather than something built on one listing.
export async function claimSpeed(deal: DealSlug): Promise<ClaimSpeed | null> {
  await dbConnect();
  const since = new Date(Date.now() - SPEED_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const passes = await Pass.find({
    createdAt: { $gte: since },
    ...dealFilter(deal),
  }).select("createdAt");
  if (passes.length < SPEED_MIN_SAMPLE) return null;

  const firstUnlocks = await Unlock.aggregate<{ _id: Types.ObjectId; first: Date }>([
    { $match: { passId: { $in: passes.map((p) => p._id) } } },
    { $group: { _id: "$passId", first: { $min: "$createdAt" } } },
  ]);
  const listedAt = new Map(passes.map((p) => [p._id.toString(), p.createdAt.getTime()]));
  const gaps = firstUnlocks
    .map((u) => (u.first.getTime() - (listedAt.get(u._id.toString()) ?? u.first.getTime())) / 60000)
    .filter((m) => m >= 0)
    .sort((a, b) => a - b);
  if (gaps.length < SPEED_MIN_SAMPLE) return null;

  const mid = Math.floor(gaps.length / 2);
  const median = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
  return { sample: gaps.length, medianMinutes: Math.max(1, Math.round(median)) };
}
