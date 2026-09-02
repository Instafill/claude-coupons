import mongoose, { Schema, Document, Model, Types } from "mongoose";

export const PASS_STATUS = {
  live: "live",
  exhausted: "exhausted", // the sender's whole allotment has been claimed
  dead: "dead", // claimers reported the link no longer works
  expired: "expired", // the submitter stopped refreshing it
  removed: "removed", // taken down by the submitter
} as const;

export type PassStatus = (typeof PASS_STATUS)[keyof typeof PASS_STATUS];

// One listed referral link. Only the code is ever stored; the URL is reconstructed as
// https://claude.ai/referral/{code}, so an arbitrary link cannot enter the board.
export interface IPass extends Document {
  _id: Types.ObjectId;
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
    code: { type: String, required: true, unique: true, trim: true },
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

const Pass: Model<IPass> =
  mongoose.models.Pass || mongoose.model<IPass>("Pass", PassSchema);

export default Pass;
