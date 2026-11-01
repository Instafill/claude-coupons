import mongoose, { Schema, Document, Model, Types } from "mongoose";

// One line of a live draw's chat: something a person in the room said, or something the room
// did (someone arrived, a spot was won, claimed, came back). Kept after the draw, so a room
// can be read back afterwards exactly as it scrolled past.

export const MESSAGE_KIND = {
  chat: "chat",
  system: "system",
} as const;

export type MessageKind = (typeof MESSAGE_KIND)[keyof typeof MESSAGE_KIND];

export interface IDrawMessage extends Document {
  _id: Types.ObjectId;
  drawId: Types.ObjectId;
  at: Date;
  kind: MessageKind;
  /** Who said it (a User id). Never sent to a room; `tile` names them there. */
  userId?: string;
  /** Their tile in the room (the DrawEntrant id), or absent for the host and the room itself. */
  tile?: string;
  /** The name as it read when it was said. */
  name?: string;
  text: string;
  /** Said by a spectator: the people running the draw. */
  host?: boolean;
  /** For the room's own lines: what happened (joined, won, claimed, released, ...). */
  event?: string;
  /** Taken down by the host. Kept, but no room shows it. */
  hidden?: boolean;
  /** Emoji people put on this line, one per person per emoji. */
  reactions?: { userId: string; emoji: string }[];
  createdAt: Date;
}

const DrawMessageSchema = new Schema<IDrawMessage>(
  {
    drawId: { type: Schema.Types.ObjectId, ref: "Draw", required: true },
    at: { type: Date, required: true },
    kind: { type: String, enum: Object.values(MESSAGE_KIND), required: true },
    userId: { type: String },
    tile: { type: String },
    name: { type: String },
    text: { type: String, required: true, maxlength: 400 },
    host: { type: Boolean },
    event: { type: String },
    hidden: { type: Boolean },
    reactions: [{ _id: false, userId: String, emoji: String }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// A room reads its latest lines; the record reads them all in order; a sender's last line
// is looked up to pace them.
DrawMessageSchema.index({ drawId: 1, at: -1 });
DrawMessageSchema.index({ drawId: 1, userId: 1, at: -1 });

const DrawMessage: Model<IDrawMessage> =
  mongoose.models.DrawMessage || mongoose.model<IDrawMessage>("DrawMessage", DrawMessageSchema);

export default DrawMessage;
