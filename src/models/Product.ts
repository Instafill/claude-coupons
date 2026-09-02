import mongoose, { Schema, Document, Model, Types } from "mongoose";

export const PRODUCT_STATUS = {
  published: "published",
  archived: "archived", // the admin kill switch: 404, out of the sitemap, kept for the record
} as const;

export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

export const PRODUCT_SOURCE = {
  founder: "founder", // created by the person who runs the product
  admin: "admin", // created from /admin ahead of the founder
  import: "import", // scripts/import-products.mjs
} as const;

export type ProductSource = (typeof PRODUCT_SOURCE)[keyof typeof PRODUCT_SOURCE];

export interface ProductFaq {
  q: string;
  a: string;
}

// A product page on the coupon marketplace. Every number the public page shows - the queue,
// the goal, the codes loaded - lives here as a counter that the write paths keep current,
// so the page renders honestly without an aggregation and without a single constant.
//
// ownerUserId absent means nobody from the product has claimed the page yet: it was set up
// by us so people could ask for a deal, and the page says so in its first screen.
export interface IProduct extends Document {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  websiteDomain: string;
  logoUrl?: string;
  status: ProductStatus;
  source: ProductSource;
  ownerUserId?: Types.ObjectId;
  claimedAt?: Date;
  createdByUserId?: Types.ObjectId;
  threshold: number;
  // The confirmed count at the moment of the last release. Each drop restarts the bar from
  // here rather than from zero, so the goal is always baseline + threshold.
  baseline: number;
  confirmedCount: number;
  // Monotonic. Never decremented, so a place in line is never handed out twice.
  positionCounter: number;
  // Sum of `remaining` over codes still in the pool (loaded, not yet released).
  poolCapacity: number;
  currentDropId?: Types.ObjectId;
  dropCount: number;
  lastDropAt?: Date;
  warrantAcceptedAt?: Date;
  faqs: ProductFaq[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    tagline: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true, maxlength: 4000 },
    websiteUrl: { type: String, required: true, trim: true },
    websiteDomain: { type: String, required: true, index: true },
    logoUrl: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(PRODUCT_STATUS),
      default: PRODUCT_STATUS.published,
      index: true,
    },
    source: { type: String, enum: Object.values(PRODUCT_SOURCE), required: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    claimedAt: { type: Date },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    threshold: { type: Number, default: 100, min: 5, max: 100000 },
    baseline: { type: Number, default: 0 },
    confirmedCount: { type: Number, default: 0 },
    positionCounter: { type: Number, default: 0 },
    poolCapacity: { type: Number, default: 0 },
    currentDropId: { type: Schema.Types.ObjectId, ref: "Drop" },
    dropCount: { type: Number, default: 0 },
    lastDropAt: { type: Date },
    warrantAcceptedAt: { type: Date },
    faqs: {
      type: [{ q: { type: String, maxlength: 200 }, a: { type: String, maxlength: 1000 } }],
      default: [],
    },
  },
  { timestamps: true }
);

// The hub orders by demand; the sitemap and hub both filter on status first.
ProductSchema.index({ status: 1, confirmedCount: -1 });

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
