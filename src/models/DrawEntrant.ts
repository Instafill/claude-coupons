import mongoose, { Schema, Document, Model, Types } from "mongoose";

// Someone who joined a draw's room: what the room shows of them, and when we last heard from
// their page. Kept off the draw row because every open page checks in every couple of
// seconds, and those writes must not contend with the draw's own.
export interface IDrawEntrant extends Document {
  drawId: Types.ObjectId;
  userId: string;
  email: string;
  /** First name only, as they typed it. */
  name: string;
  /** Their Google picture, when they chose to show it. Never an upload. */
  picture?: string;
  city: string;
  country: string;
  /** Rounded to the half degree: a pin on a world map, not a location. */
  lat: number;
  lon: number;
  joinedAt: Date;
  lastSeenAt: Date;
  /** Their page said goodbye (closed, navigated away). Cleared the moment it checks in again. */
  leftAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DrawEntrantSchema = new Schema<IDrawEntrant>(
  {
    drawId: { type: Schema.Types.ObjectId, ref: "Draw", required: true },
    userId: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    name: { type: String, required: true },
    picture: { type: String },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    lat: { type: Number, default: 0 },
    lon: { type: Number, default: 0 },
    joinedAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    leftAt: { type: Date },
  },
  { timestamps: true }
);

DrawEntrantSchema.index({ drawId: 1, userId: 1 }, { unique: true });

const DrawEntrant: Model<IDrawEntrant> =
  mongoose.models.DrawEntrant || mongoose.model<IDrawEntrant>("DrawEntrant", DrawEntrantSchema);

export default DrawEntrant;
