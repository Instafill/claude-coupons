import mongoose, { Schema, Document, Model, Types } from "mongoose";

export const COUPON_KIND = {
  percent: "percent",
  fixed: "fixed",
  free_days: "free_days",
  custom: "custom",
} as const;

export type CouponKind = (typeof COUPON_KIND)[keyof typeof COUPON_KIND];

export const COUPON_STATUS = {
  pool: "pool", // loaded, waiting for the next release
  live: "live", // attached to a drop, claimable while remaining > 0
  exhausted: "exhausted",
  revoked: "revoked", // pulled by the founder before release
} as const;

export type CouponStatus = (typeof COUPON_STATUS)[keyof typeof COUPON_STATUS];

// One distinct code. Twenty unique codes are twenty documents with maxClaims 1; one shared
// code good for fifty people is one document with maxClaims 50. `remaining` is kept as its
// own counter so the claim path is a plain indexed filter (remaining > 0) and one atomic
// decrement, with no $expr and no transaction.
export interface ICoupon extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  dropId?: Types.ObjectId;
  code: string;
  kind: CouponKind;
  value?: number;
  label: string;
  terms?: string;
  redeemUrl?: string;
  expiresAt?: Date;
  maxClaims: number;
  remaining: number;
  claimedCount: number;
  status: CouponStatus;
  createdByUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    dropId: { type: Schema.Types.ObjectId, ref: "Drop" },
    code: { type: String, required: true, trim: true, maxlength: 64 },
    kind: { type: String, enum: Object.values(COUPON_KIND), required: true },
    value: { type: Number },
    label: { type: String, required: true, maxlength: 80 },
    terms: { type: String, maxlength: 300 },
    redeemUrl: { type: String, trim: true },
    expiresAt: { type: Date },
    maxClaims: { type: Number, default: 1, min: 1 },
    remaining: { type: Number, required: true, min: 0 },
    claimedCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(COUPON_STATUS),
      default: COUPON_STATUS.pool,
    },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// A code is listed once per product; pasting it twice is reported, not duplicated.
CouponSchema.index({ productId: 1, code: 1 }, { unique: true });
// The atomic pick: oldest live code with something left.
CouponSchema.index({ dropId: 1, status: 1, remaining: 1, createdAt: 1 });
CouponSchema.index({ productId: 1, status: 1 });

const Coupon: Model<ICoupon> =
  mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", CouponSchema);

export default Coupon;
