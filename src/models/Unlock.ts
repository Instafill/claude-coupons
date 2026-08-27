import mongoose, { Schema, Document, Model, Types } from "mongoose";

export const UNLOCK_OUTCOME = {
  none: "none", // unlocked, hasn't said whether it worked
  claimed: "claimed",
  dead: "dead",
} as const;

export type UnlockOutcome = (typeof UNLOCK_OUTCOME)[keyof typeof UNLOCK_OUTCOME];

// The log the signup wall exists for: who unlocked which pass, and what they reported
// happened when they tried it. One row per (pass, user) - re-unlocking is idempotent.
export interface IUnlock extends Document {
  passId: Types.ObjectId;
  userId: Types.ObjectId;
  ipHash: string;
  outcome: UnlockOutcome;
  outcomeAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UnlockSchema = new Schema<IUnlock>(
  {
    passId: { type: Schema.Types.ObjectId, required: true, ref: "Pass", index: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User", index: true },
    ipHash: { type: String, default: "" },
    outcome: { type: String, enum: Object.values(UNLOCK_OUTCOME), default: UNLOCK_OUTCOME.none },
    outcomeAt: { type: Date },
  },
  { timestamps: true }
);

UnlockSchema.index({ passId: 1, userId: 1 }, { unique: true });

const Unlock: Model<IUnlock> =
  mongoose.models.Unlock || mongoose.model<IUnlock>("Unlock", UnlockSchema);

export default Unlock;
