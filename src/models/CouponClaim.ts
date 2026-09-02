import mongoose, { Schema, Document, Model, Types } from "mongoose";

// Who got which code in which drop. The unique index on (drop, subscriber) is the rule
// "one code per person per drop" - it is enforced by the database, not by a check that a
// double click could slip past. The code is copied here so the claimant keeps it even if
// the founder later revokes the coupon row.
export interface ICouponClaim extends Document {
  _id: Types.ObjectId;
  dropId: Types.ObjectId;
  subscriberId: Types.ObjectId;
  couponId: Types.ObjectId;
  productId: Types.ObjectId;
  code: string;
  ipHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CouponClaimSchema = new Schema<ICouponClaim>(
  {
    dropId: { type: Schema.Types.ObjectId, ref: "Drop", required: true },
    subscriberId: { type: Schema.Types.ObjectId, ref: "Subscriber", required: true, index: true },
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    code: { type: String, required: true },
    ipHash: { type: String },
  },
  { timestamps: true }
);

CouponClaimSchema.index({ dropId: 1, subscriberId: 1 }, { unique: true });

const CouponClaim: Model<ICouponClaim> =
  mongoose.models.CouponClaim ||
  mongoose.model<ICouponClaim>("CouponClaim", CouponClaimSchema);

export default CouponClaim;
