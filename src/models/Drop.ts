import mongoose, { Schema, Document, Model, Types } from "mongoose";

export const DROP_STATUS = {
  pending: "pending", // the goal was reached (or the founder asked); nothing sent yet
  releasing: "releasing", // codes attached and claimable; the list is being emailed
  released: "released", // everyone on the list has been emailed
  exhausted: "exhausted", // every code claimed
} as const;

export type DropStatus = (typeof DROP_STATUS)[keyof typeof DROP_STATUS];

export const DROP_RELEASED_BY = {
  founder: "founder",
  admin: "admin",
} as const;

// One release of codes to one product's list. Claims are allowed from `releasing` on - the
// first email goes out the same moment the codes go live, which is the fairness the page
// promises - and the drop ends when the last code is claimed.
export interface IDrop extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  number: number;
  status: DropStatus;
  releasedBy?: string;
  capacity: number;
  claimedCount: number;
  subscribersAtRelease: number;
  releasedAt?: Date;
  exhaustedAt?: Date;
  ownerNotifiedAt?: Date;
  notify: { total: number; sent: number; failed: number };
  createdAt: Date;
  updatedAt: Date;
}

const DropSchema = new Schema<IDrop>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    number: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(DROP_STATUS),
      default: DROP_STATUS.pending,
      index: true,
    },
    releasedBy: { type: String, enum: Object.values(DROP_RELEASED_BY) },
    capacity: { type: Number, default: 0 },
    claimedCount: { type: Number, default: 0 },
    subscribersAtRelease: { type: Number, default: 0 },
    releasedAt: { type: Date },
    exhaustedAt: { type: Date },
    ownerNotifiedAt: { type: Date },
    notify: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

DropSchema.index({ productId: 1, number: 1 }, { unique: true });

const Drop: Model<IDrop> = mongoose.models.Drop || mongoose.model<IDrop>("Drop", DropSchema);

export default Drop;
