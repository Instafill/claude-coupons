import mongoose, { Schema, Document, Model } from "mongoose";

import { DEAL_SLUGS, DealSlug } from "@/lib/deals";
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
  // Which boards they asked for, held until the confirmation link is clicked - a place in
  // line is only ever handed to a proven address. Emptied once the memberships exist.
  pendingDeals?: DealSlug[];
  // Stamped when this row's place in the Claude queue was copied into a Membership. Its
  // absence is what lib/queue.ts looks for to find the rows that still need adopting, so
  // the migration finishes itself and then costs nothing.
  queueMigratedAt?: Date;
  // The queue number, handed out on confirmation and never reused.
  //
  // Legacy: the queue lives in the Membership collection now, one row per board, because a
  // single number cannot say where someone stands on five of them. Nothing writes these
  // five fields any more; they are read once, by the adoption pass in lib/queue.ts, which
  // copies them into that person's Claude membership so nobody loses the place they have
  // been holding. See models/Membership.ts.
  position?: number;
  leftQueueAt?: Date;
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
  // Where the edge placed them when they joined. Country and city only - the IP that
  // implies it is hashed and never stored, and the finer coordinates the edge offers say
  // more about a person than a list of subscribers needs to know.
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
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
    pendingDeals: { type: [String], enum: DEAL_SLUGS, default: undefined },
    queueMigratedAt: { type: Date },
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
    country: { type: String, index: true },
    region: { type: String },
    city: { type: String },
    timezone: { type: String },
  },
  { timestamps: true }
);

// Finding the rows whose legacy queue place has not been adopted yet. Once the collection
// is migrated this index answers "none" immediately, which is the point: the adoption pass
// runs on every wave advance and must cost nothing after the first one.
WatcherSchema.index({ confirmedAt: 1, stoppedAt: 1, queueMigratedAt: 1 });

const Watcher: Model<IWatcher> =
  mongoose.models.Watcher || mongoose.model<IWatcher>("Watcher", WatcherSchema);

export default Watcher;
