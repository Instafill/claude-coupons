import mongoose, { Schema, Document, Model, Types } from "mongoose";

import { DEAL_SLUGS, DealSlug } from "@/lib/deals";

// One live draw: a set of held listings given out, one use at a time, to the people who
// are in the room when it runs. Everything that decides who wins lives on this row and moves
// only through lib/draw.ts, which writes it under `rev` so two requests advancing the same
// draw at once cannot both win.

export const DRAW_STATUS = {
  open: "open", // the countdown: invited people arrive and join
  drawing: "drawing", // spots are being drawn, claimed and re-drawn
  closed: "closed", // every spot is claimed, or nobody was left to draw one for
} as const;

export type DrawStatus = (typeof DRAW_STATUS)[keyof typeof DRAW_STATUS];

export const SPOT_STATUS = {
  pending: "pending",
  drawing: "drawing",
  claiming: "claiming",
  claimed: "claimed",
  unclaimed: "unclaimed", // nobody eligible was left in the room
} as const;

export type SpotStatus = (typeof SPOT_STATUS)[keyof typeof SPOT_STATUS];

/** Why a winner lost a spot: the codes a draw's report counts. */
export type ReleaseReason = "passed_on" | "timeout" | "left";

/** One use of one listing. A Claude link is good for three sign-ups, so it is three spots. */
export interface ISpot {
  n: number;
  passId: Types.ObjectId;
  status: SpotStatus;
  /** The winner holding it now (a User id). */
  holder?: string;
  claimStart?: Date;
  claimEnd?: Date;
  /** Set while the holder is out of the room: the spot goes back GRACE seconds after it. */
  graceFrom?: Date;
  claimedAt?: Date;
  history: { userId: string; reason: ReleaseReason; at: Date }[];
}

/** A sweep in progress. The winner is fixed when it starts; the steps are the show. */
export interface ISweep {
  spot: number;
  redraw: boolean;
  start: Date;
  end: Date;
  candidates: number;
  /** The tiles the highlight visits, in order; the last one is the winner. */
  steps: { at: Date; userId: string }[];
}

/** A public line of what happened, for the room's banner and activity list. */
export interface IFeedItem {
  id: number;
  at: Date;
  kind: "sweep" | "won" | "claimed" | "released" | "winner_left" | "winner_back" | "unfilled" | "closed";
  spot?: number;
  userId?: string;
  reason?: ReleaseReason;
  redraw?: boolean;
  candidates?: number;
  claimed?: number;
}

export interface IDraw extends Document {
  _id: Types.ObjectId;
  deal: DealSlug;
  drawAt: Date;
  /** A draw announced ahead: until then the page shows a countdown and nobody can join. */
  opensAt?: Date;
  claimSeconds: number;
  status: DrawStatus;
  /** A test draw invites the addresses it was given, never the line, and moves nobody in it. */
  test: boolean;
  passIds: Types.ObjectId[];
  spots: ISpot[];
  /** Who may enter: the front of the line when the invites went out. Lower-cased. Never read
      on a room's every ask (see load() in lib/draw.ts): a show invites the whole line. */
  invited: string[];
  invitedCount: number;
  /** Who the invite email has gone to, so a send that stopped part-way can pick up where it was. */
  sent: string[];
  /** May watch, never join: the operator, and the recorder filming the show. */
  spectators: string[];
  /** A show: everyone waiting was invited, so not coming costs nobody their place. */
  everyone: boolean;
  /** The host closed the chat: the room is read-only from then on. */
  chatClosedAt?: Date;
  /** People the host blocked from the chat (User ids): their lines are hidden, they can't post. */
  chatBlocked?: string[];
  jobs: { spot: number; redraw: boolean }[];
  nextJobAt?: Date;
  sweep?: ISweep;
  /** Every award with the sweep it came from, for the closing check. */
  awards: { spot: number; userId: string; at: Date; sweepStart: Date }[];
  feed: IFeedItem[];
  feedSeq: number;
  /** Outside `rev`: a reaction changes nothing about the draw, so it never contends with it. */
  reactions: { id: string; at: Date; userId: string; emoji: string }[];
  rev: number;
  startedAt?: Date;
  closedAt?: Date;
  check?: { ok: boolean; problems: string[] };
  createdAt: Date;
  updatedAt: Date;
}

const SpotSchema = new Schema<ISpot>(
  {
    n: { type: Number, required: true },
    passId: { type: Schema.Types.ObjectId, ref: "Pass", required: true },
    status: { type: String, enum: Object.values(SPOT_STATUS), default: SPOT_STATUS.pending },
    holder: { type: String },
    claimStart: { type: Date },
    claimEnd: { type: Date },
    graceFrom: { type: Date },
    claimedAt: { type: Date },
    history: [{ _id: false, userId: String, reason: String, at: Date }],
  },
  { _id: false }
);

const DrawSchema = new Schema<IDraw>(
  {
    deal: { type: String, enum: DEAL_SLUGS, required: true },
    drawAt: { type: Date, required: true },
    opensAt: { type: Date },
    claimSeconds: { type: Number, required: true },
    status: { type: String, enum: Object.values(DRAW_STATUS), default: DRAW_STATUS.open, index: true },
    test: { type: Boolean, default: false },
    passIds: [{ type: Schema.Types.ObjectId, ref: "Pass" }],
    spots: [SpotSchema],
    invited: [{ type: String, lowercase: true }],
    invitedCount: { type: Number, default: 0 },
    sent: [{ type: String, lowercase: true }],
    spectators: [{ type: String, lowercase: true }],
    everyone: { type: Boolean, default: false },
    chatClosedAt: { type: Date },
    chatBlocked: [{ type: String }],
    jobs: [{ _id: false, spot: Number, redraw: Boolean }],
    nextJobAt: { type: Date },
    sweep: {
      type: new Schema(
        {
          spot: Number,
          redraw: Boolean,
          start: Date,
          end: Date,
          candidates: Number,
          steps: [{ _id: false, at: Date, userId: String }],
        },
        { _id: false }
      ),
    },
    awards: [{ _id: false, spot: Number, userId: String, at: Date, sweepStart: Date }],
    feed: [
      {
        _id: false,
        id: Number,
        at: Date,
        kind: String,
        spot: Number,
        userId: String,
        reason: String,
        redraw: Boolean,
        candidates: Number,
        claimed: Number,
      },
    ],
    feedSeq: { type: Number, default: 0 },
    reactions: [{ _id: false, id: String, at: Date, userId: String, emoji: String }],
    rev: { type: Number, default: 0 },
    startedAt: { type: Date },
    closedAt: { type: Date },
    check: { type: new Schema({ ok: Boolean, problems: [String] }, { _id: false }) },
  },
  { timestamps: true }
);

// One real draw per board per slot, so a cron run that fires twice opens one room. Test
// draws are left out of it: a test may be started at any time, as often as needed.
DrawSchema.index({ deal: 1, drawAt: 1 }, { unique: true, partialFilterExpression: { test: false } });

const Draw: Model<IDraw> = mongoose.models.Draw || mongoose.model<IDraw>("Draw", DrawSchema);

export default Draw;
