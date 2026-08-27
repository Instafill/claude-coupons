import mongoose, { Schema, Document, Model } from "mongoose";

// One account per email, shared by both sides of the exchange: whoever signs in to list a
// pass and whoever signs in to unlock one land in the same collection. Google sign-in and
// the email magic link both resolve to an email address, so that is the identity.
export interface IUser extends Document {
  email: string;
  name?: string;
  picture?: string;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String },
    picture: { type: String },
    googleId: { type: String, sparse: true },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
