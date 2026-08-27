import crypto from "crypto";
import { Types } from "mongoose";

import { dbConnect } from "@/lib/mongodb";
import Pass, { IPass, PASS_STATUS } from "@/models/Pass";
import Unlock, { IUnlock, UNLOCK_OUTCOME, UnlockOutcome } from "@/models/Unlock";

// A Pro/Max subscriber holds at most this many guest passes, so after this many reported
// claims the listing cannot have anything left to give.
export const MAX_CLAIMS_PER_PASS = 3;
const DEAD_REPORTS_TO_HIDE = 2;
const LISTING_LIFETIME_DAYS = 21;

// Anti-hoarding: how many distinct passes one account may unlock per rolling day.
export const UNLOCKS_PER_USER_PER_DAY = 3;

// Accepts a full referral URL or a bare code; only the code survives.
const REFERRAL_SHAPE = /^(?:https?:\/\/claude\.ai\/referral\/)?([A-Za-z0-9]{6,20})\/?$/;

export function parseReferralCode(input: string): string | null {
  const match = REFERRAL_SHAPE.exec(input.trim());
  return match ? match[1] : null;
}

export function passUrl(code: string): string {
  return `https://claude.ai/referral/${code}`;
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
  maskedCode: string;
  claimedCount: number;
  createdAt: string;
  unlockedOutcome: UnlockOutcome | null;
}

// The hiding rules, evaluated lazily on read. Writes back only on a transition, so the
// board self-maintains without a cron job.
function nextStatus(pass: IPass): string | null {
  if (pass.status !== PASS_STATUS.live) return null;
  if (pass.claimedCount >= MAX_CLAIMS_PER_PASS) return PASS_STATUS.exhausted;
  if (pass.deadCount >= DEAD_REPORTS_TO_HIDE && pass.deadCount > pass.claimedCount)
    return PASS_STATUS.dead;
  const cutoff = Date.now() - LISTING_LIFETIME_DAYS * 24 * 60 * 60 * 1000;
  if (pass.lastRefreshedAt.getTime() < cutoff) return PASS_STATUS.expired;
  return null;
}

// The public board: live listings, least-claimed first so fresh allotments surface.
// A signed-in viewer sees the codes they already unlocked revealed in place.
export async function getBoard(userId: string | null): Promise<BoardPass[]> {
  await dbConnect();
  const passes = await Pass.find({ status: PASS_STATUS.live });

  const live: IPass[] = [];
  for (const pass of passes) {
    const next = nextStatus(pass);
    if (next) {
      await Pass.updateOne({ _id: pass._id }, { $set: { status: next } });
      continue;
    }
    live.push(pass);
  }

  const unlocks = userId
    ? await Unlock.find({ userId: new Types.ObjectId(userId) })
    : [];
  const mine = new Map(unlocks.map((u) => [u.passId.toString(), u]));

  return live
    .sort(
      (a, b) =>
        a.claimedCount - b.claimedCount ||
        b.createdAt.getTime() - a.createdAt.getTime()
    )
    .map((pass) => {
      const unlock = mine.get(pass._id.toString());
      return {
        id: pass._id.toString(),
        code: unlock ? pass.code : null,
        maskedCode: maskCode(pass.code),
        claimedCount: pass.claimedCount,
        createdAt: pass.createdAt.toISOString(),
        unlockedOutcome: unlock ? unlock.outcome : null,
      };
    });
}

export async function countRecentUnlocks(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return Unlock.countDocuments({
    userId: new Types.ObjectId(userId),
    createdAt: { $gt: cutoff },
  });
}

// Idempotent: a second unlock of the same pass returns the existing row and neither
// bumps the counter nor spends another slot of the daily cap.
export async function recordUnlock(
  passId: string,
  userId: string,
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
    { $setOnInsert: { ...filter, ipHash, outcome: UNLOCK_OUTCOME.none } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await Pass.updateOne({ _id: filter.passId }, { $inc: { unlockCount: 1 } });
  return unlock;
}

// Records the "did it work?" answer on the caller's own unlock, once. The pass counters
// move with it, which is what eventually hides the listing.
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
