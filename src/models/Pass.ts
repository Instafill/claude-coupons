import mongoose, { Schema, Document, Model, Types } from "mongoose";

import { DEAL_SLUGS, DEFAULT_DEAL, DealSlug } from "@/lib/deals";

export const PASS_STATUS = {
  live: "live",
  exhausted: "exhausted", // the sender's whole allotment has been claimed
  dead: "dead", // claimers reported the link no longer works
  expired: "expired", // the submitter stopped refreshing it
  removed: "removed", // taken down by the submitter
} as const;

export type PassStatus = (typeof PASS_STATUS)[keyof typeof PASS_STATUS];

// One listed referral code. Only the code is ever stored; where the brand has a personal
// link, it is rebuilt from lib/deals.ts, so an arbitrary link cannot enter the board.
export interface IPass extends Document {
  _id: Types.ObjectId;
  /** Which board this belongs to. Rows written before there was more than one carry none,
      which is why every read defaults it rather than requiring it. */
  deal: DealSlug;
  code: string;
  submitterUserId?: Types.ObjectId;
  submitterIpHash?: string;
  status: PassStatus;
  lastRefreshedAt: Date;
  // When wave 1 opened. Reset on relisting, so a pass that comes back starts its offer
  // rounds again from the front of the queue.
  waveStartedAt: Date;
  wavesNotified: number;
  // The highest queue number already emailed about this pass. Sending walks forward from
  // here, so nobody is mailed twice about one pass and nobody in between is skipped.
  waveCursor: number;
  unlockCount: number;
  claimedCount: number;
  deadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PassSchema = new Schema<IPass>(
  {
    deal: { type: String, enum: DEAL_SLUGS, default: DEFAULT_DEAL, index: true },
    code: { type: String, required: true, trim: true },
    submitterUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    submitterIpHash: { type: String, index: true },
    status: { type: String, enum: Object.values(PASS_STATUS), default: PASS_STATUS.live, index: true },
    lastRefreshedAt: { type: Date, default: Date.now },
    waveStartedAt: { type: Date, default: Date.now },
    wavesNotified: { type: Number, default: 0 },
    waveCursor: { type: Number, default: 0 },
    // Denormalized from the unlock log so the board renders without an aggregation.
    unlockCount: { type: Number, default: 0 },
    claimedCount: { type: Number, default: 0 },
    deadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Codes are unique per board, not globally: a six-character Muse code and a Pokémon GO code
// could collide by chance, and one brand's listing must never block another's. The old
// single-field unique index on code is dropped by scripts/migrate-deals.mjs - Mongoose
// creates indexes but never removes the ones it no longer declares.
PassSchema.index({ deal: 1, code: 1 }, { unique: true });

const Pass: Model<IPass> =
  mongoose.models.Pass || mongoose.model<IPass>("Pass", PassSchema);

export default Pass;
