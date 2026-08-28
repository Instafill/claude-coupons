import mongoose, { Schema, Document, Model, Types } from "mongoose";

// What people pasted when the submit form turned them away, verbatim. This exists because
// the c_ULXAbieQ bug was only diagnosable from a user's screenshot: the validator rejected
// every current-format invite link for a day and the logs held nothing but {reason:
// "bad_link"}. The raw input lives here rather than in the runtime log - the database
// already stores every live code in plaintext, while log storage has short retention and
// wider exposure. A rejected paste is the one signal that shows what the validator gets
// wrong next time.
export interface IRejectedSubmission extends Document {
  input: string;
  reason: string;
  userId?: Types.ObjectId;
  ipHash?: string;
  createdAt: Date;
}

const RejectedSubmissionSchema = new Schema<IRejectedSubmission>(
  {
    input: { type: String, required: true, maxlength: 500 },
    reason: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    ipHash: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const RejectedSubmission: Model<IRejectedSubmission> =
  mongoose.models.RejectedSubmission ||
  mongoose.model<IRejectedSubmission>("RejectedSubmission", RejectedSubmissionSchema);

export default RejectedSubmission;
