import mongoose, { Schema, Document, Model } from "mongoose";

import { MAX_WANTS_LENGTH } from "@/lib/wants";

// Someone who asked to hear when the board has passes again. One row per address, reused
// forever: subscribing, confirming, stopping and re-subscribing all move fields on the same
// document rather than creating and deleting rows. That is what lets a second click on a
// stop link still answer "you're not watching" instead of "invalid link".
//
// An address is mailed an alert only when confirmedAt is set and stoppedAt is not. Nothing
// else in this schema can put mail in someone's inbox.
export interface IWatcher extends Document {
  email: string;
  userId?: mongoose.Types.ObjectId;
  ipHash?: string;
  confirmToken?: string;
  confirmSentAt?: Date;
  confirmedAt?: Date;
  stopToken: string;
  // Rides in the alert email as the link that both signs the address in and lands on the
  // board. Separate from stopToken on purpose: a stop link must stay harmless if it leaks,
  // and a link that starts a session is not harmless.
  enterToken?: string;
  // The queue number, handed out on confirmation and never reused. Waiting can only make
  // it worse, which is the whole point of showing it.
  position?: number;
  // Set when they unlocked a pass: they had their turn and are out of the queue. The row
  // stays so the stop link keeps working and a dead-link report can put them back.
  leftQueueAt?: Date;
  // Turns offered without an unlock. At three, the number is reissued at the back, so a
  // sleeping front row cannot hold up every pass behind it.
  offersSinceUnlock: number;
  lastNotifiedAt?: Date;
  notifyCount: number;
  stoppedAt?: Date;
  // What they said they would do after the free week, asked when they took their number.
  // Deliberately does not affect their place in line - the form says so, because an answer
  // that buys position is an answer everyone gives.
  intent?: WatchIntent;
  // The price probe: they pressed a button offering to skip the line, and were told on the
  // spot that it does not exist. Nothing is charged and the queue does not move. This is a
  // record of the press, which is the only thing being measured.
  skipProbeAt?: Date;
  skipProbeCount: number;
  // What else they said they would want a deal for, typed rather than picked: a menu tells
  // people what to want, and the point of asking is to find out what we did not think of.
  wants?: string;
  // The separate, unticked opt-in. The confirmation mail promises pass alerts and never a
  // newsletter, so nothing but an explicit yes here may ever put other mail in their inbox
  // - and even then, not from this list.
  wantsOptIn?: boolean;
  wantsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const WATCH_INTENT = {
  subscribe: "subscribe", // expects to pay for Pro after the week
  free: "free", // wants the free week only
  unsure: "unsure",
} as const;

export type WatchIntent = (typeof WATCH_INTENT)[keyof typeof WATCH_INTENT];

const WatcherSchema = new Schema<IWatcher>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Set when the address came from a signed-in session, so the row can be tied back to an
    // account. Absent for anonymous sign-ups - the email is the identity there.
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    // One-way hash, for throttling confirmation mail per connection. Never reversed.
    ipHash: { type: String, index: true },
    // Cleared the moment it is spent, so a replayed confirmation link finds nothing.
    confirmToken: { type: String, index: true, sparse: true },
    confirmSentAt: { type: Date },
    confirmedAt: { type: Date },
    // Long-lived on purpose: it rides in every alert as the one-click way out, so it has to
    // keep working months after it was issued.
    stopToken: { type: String, required: true, unique: true },
    enterToken: { type: String, unique: true, sparse: true },
    position: { type: Number },
    leftQueueAt: { type: Date },
    offersSinceUnlock: { type: Number, default: 0 },
    lastNotifiedAt: { type: Date },
    notifyCount: { type: Number, default: 0 },
    // Soft delete. Keeping the row keeps the stop link idempotent and lets a returning
    // subscriber reuse it instead of colliding with the unique index on email.
    stoppedAt: { type: Date },
    intent: { type: String, enum: Object.values(WATCH_INTENT), index: true },
    skipProbeAt: { type: Date },
    skipProbeCount: { type: Number, default: 0 },
    wants: { type: String, maxlength: MAX_WANTS_LENGTH },
    wantsOptIn: { type: Boolean },
    wantsAt: { type: Date },
  },
  { timestamps: true }
);

// Everything the queue does is a walk over active members in position order: ranking one
// person, taking the next ten, counting the line.
WatcherSchema.index({ confirmedAt: 1, stoppedAt: 1, leftQueueAt: 1, position: 1 });

const Watcher: Model<IWatcher> =
  mongoose.models.Watcher || mongoose.model<IWatcher>("Watcher", WatcherSchema);

export default Watcher;
