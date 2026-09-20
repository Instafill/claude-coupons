import mongoose, { Schema, Document, Model, Types } from "mongoose";

import { DEAL_SLUGS, DealSlug } from "@/lib/deals";

/**
 * One person's place in one deal's queue.
 *
 * The queue used to live on the Watcher document, which was right while there was one
 * board. With four, a number has to belong to a board: unlocking a Waymo code must not
 * spend the turn someone has been waiting for on the Claude line, and someone who wants
 * Uber codes must not be offered - or counted in the wave arithmetic of - a board they
 * never asked about.
 *
 * A row exists only for a confirmed address, and is stopped rather than deleted, so the
 * stop link stays idempotent exactly as it does on the Watcher. That is what lets every
 * walk in lib/queue.ts be a plain indexed query on this collection alone, with no join
 * back to the watcher to find out whether they are still on the list.
 */
export interface IMembership extends Document {
  _id: Types.ObjectId;
  watcherId: Types.ObjectId;
  /** Denormalized from the watcher: every queue operation starts from the address. */
  email: string;
  deal: DealSlug;
  /** Handed out once and never reused. Waiting can only make it worse. */
  position: number;
  /** Set when they unlocked a listing on this board: their turn here is spent. */
  leftQueueAt?: Date;
  /** Turns offered without an unlock. At three, the number is reissued at the back. */
  offersSinceUnlock: number;
  lastNotifiedAt?: Date;
  notifyCount: number;
  /** Soft delete, moved in step with the watcher's own stop. */
  stoppedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<IMembership>(
  {
    watcherId: { type: Schema.Types.ObjectId, ref: "Watcher", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    deal: { type: String, enum: DEAL_SLUGS, required: true },
    position: { type: Number, required: true },
    leftQueueAt: { type: Date },
    offersSinceUnlock: { type: Number, default: 0 },
    lastNotifiedAt: { type: Date },
    notifyCount: { type: Number, default: 0 },
    stoppedAt: { type: Date },
  },
  { timestamps: true }
);

// One place in line per person per board, and rejoining moves this row rather than adding
// a second one.
MembershipSchema.index({ email: 1, deal: 1 }, { unique: true });
// Everything the queue does is a walk over active members of one board in position order:
// ranking one person, taking the next ten, counting the line.
MembershipSchema.index({ deal: 1, stoppedAt: 1, leftQueueAt: 1, position: 1 });

const Membership: Model<IMembership> =
  mongoose.models.Membership || mongoose.model<IMembership>("Membership", MembershipSchema);

export default Membership;
