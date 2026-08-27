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
  submitterUserId: Types.ObjectId;
  status: PassStatus;
  lastRefreshedAt: Date;
  unlockCount: number;
  claimedCount: number;
  deadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PassSchema = new Schema<IPass>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    submitterUserId: { type: Schema.Types.ObjectId, required: true, ref: "User", index: true },
    status: { type: String, enum: Object.values(PASS_STATUS), default: PASS_STATUS.live, index: true },
    lastRefreshedAt: { type: Date, default: Date.now },
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
