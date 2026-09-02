import mongoose, { Schema, Document, Model } from "mongoose";

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
  lastNotifiedAt?: Date;
  notifyCount: number;
  stoppedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

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
    lastNotifiedAt: { type: Date },
    notifyCount: { type: Number, default: 0 },
    // Soft delete. Keeping the row keeps the stop link idempotent and lets a returning
    // subscriber reuse it instead of colliding with the unique index on email.
    stoppedAt: { type: Date },
  },
  { timestamps: true }
);

const Watcher: Model<IWatcher> =
  mongoose.models.Watcher || mongoose.model<IWatcher>("Watcher", WatcherSchema);

export default Watcher;
