import mongoose, { Schema, Document, Model } from "mongoose";

// A single-use magic-link token. Consumed on first click; Mongo expires the row itself
// 30 minutes after it was issued, so used and stale tokens both disappear on their own.
export interface ILoginToken extends Document {
  token: string;
  email: string;
  returnTo: string;
  usedAt?: Date;
  createdAt: Date;
}

const LoginTokenSchema = new Schema<ILoginToken>({
  token: { type: String, required: true, unique: true },
  email: { type: String, required: true, lowercase: true },
  returnTo: { type: String, default: "/" },
  usedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, expires: 60 * 30 },
});

const LoginToken: Model<ILoginToken> =
  mongoose.models.LoginToken ||
  mongoose.model<ILoginToken>("LoginToken", LoginTokenSchema);

export default LoginToken;
