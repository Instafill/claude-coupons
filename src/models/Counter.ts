import mongoose, { Schema, Model } from "mongoose";

// One row per named sequence, bumped with $inc so two people confirming in the same
// instant cannot be handed the same queue number. Max(position)+1 would race; this cannot.
export interface ICounter {
  _id: string;
  value: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  value: { type: Number, default: 0 },
});

const Counter: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>("Counter", CounterSchema);

export default Counter;
