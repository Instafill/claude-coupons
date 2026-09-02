import mongoose, { Schema, Document, Model, Types } from "mongoose";

export const OWNERSHIP_STATUS = {
  pending: "pending", // waiting on the admin
  auto_approved: "auto_approved", // the sign-in address was on the product's own domain
  approved: "approved",
  rejected: "rejected",
} as const;

export type OwnershipStatus = (typeof OWNERSHIP_STATUS)[keyof typeof OWNERSHIP_STATUS];

// "I run this product, give me the page." Named to keep "claim" for coupons only.
export interface IOwnershipRequest extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  userId: Types.ObjectId;
  email: string;
  emailDomain: string;
  status: OwnershipStatus;
  note?: string;
  decidedAt?: Date;
  decidedByUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OwnershipRequestSchema = new Schema<IOwnershipRequest>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true, lowercase: true },
    emailDomain: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(OWNERSHIP_STATUS),
      default: OWNERSHIP_STATUS.pending,
      index: true,
    },
    note: { type: String, maxlength: 500 },
    decidedAt: { type: Date },
    decidedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

OwnershipRequestSchema.index({ productId: 1, userId: 1 }, { unique: true });

const OwnershipRequest: Model<IOwnershipRequest> =
  mongoose.models.OwnershipRequest ||
  mongoose.model<IOwnershipRequest>("OwnershipRequest", OwnershipRequestSchema);

export default OwnershipRequest;
