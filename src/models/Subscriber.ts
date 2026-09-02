import mongoose, { Schema, Document, Model, Types } from "mongoose";

// Someone waiting for one product's codes. The same shape as Watcher, scoped to a product
// and given a place in line: subscribing, confirming, stopping and re-subscribing all move
// fields on the one document, so the stop link stays valid and idempotent.
//
// An address is mailed only when confirmedAt is set and stoppedAt is not, and only for the
// product it subscribed to. Nothing else in this schema can put mail in an inbox.
export interface ISubscriber extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  email: string;
  userId?: Types.ObjectId;
  ipHash?: string;
  confirmToken?: string;
  confirmSentAt?: Date;
  confirmedAt?: Date;
  // Long-lived. Rides in every email as both the one-click stop link and the claim link,
  // so it identifies the subscriber on the page without a sign-in.
  accessToken: string;
  // Their place in line, assigned once on confirmation from Product.positionCounter.
  position?: number;
  // What they agreed to, verbatim, and when. Kept so the record can be shown on request.
  consentText?: string;
  consentAt?: Date;
  stoppedAt?: Date;
  lastNotifiedDropId?: Types.ObjectId;
  lastNotifiedAt?: Date;
  notifyCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriberSchema = new Schema<ISubscriber>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    ipHash: { type: String },
    confirmToken: { type: String, index: true, sparse: true },
    confirmSentAt: { type: Date },
    confirmedAt: { type: Date },
    accessToken: { type: String, required: true, unique: true },
    position: { type: Number },
    consentText: { type: String },
    consentAt: { type: Date },
    stoppedAt: { type: Date },
    lastNotifiedDropId: { type: Schema.Types.ObjectId, ref: "Drop" },
    lastNotifiedAt: { type: Date },
    notifyCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One row per address per product - the same address can wait on several products.
SubscriberSchema.index({ productId: 1, email: 1 }, { unique: true });
// The fan-out walks this: confirmed, not stopped, not yet told about this drop, by _id.
SubscriberSchema.index({ productId: 1, confirmedAt: 1, stoppedAt: 1, lastNotifiedDropId: 1, _id: 1 });
// Per-connection throttle on confirmation mail.
SubscriberSchema.index({ ipHash: 1, confirmSentAt: 1 });

const Subscriber: Model<ISubscriber> =
  mongoose.models.Subscriber || mongoose.model<ISubscriber>("Subscriber", SubscriberSchema);

export default Subscriber;
