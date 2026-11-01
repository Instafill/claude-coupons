import type { Place } from "@/lib/places";

// What the room renders: one frame of a draw, as one visitor sees it. LiveDraw builds it from
// the server's view (lib/draw.ts) and the clock; Room, JoinPanel and the map only read it.

export interface Person extends Place {
  id: string;
  name: string;
  photo?: string;
  /** Feeds the identicon, so a person without a photo always gets the same face. */
  seed: string;
  /** Seconds, on the same clock as View.t. */
  joinAt: number;
  joined: boolean;
  left: boolean;
  me?: boolean;
}

export type PassStatus = "pending" | "drawing" | "claiming" | "claimed" | "unclaimed";

/** One spot: one use of one listed link. */
export interface Pass {
  n: number;
  status: PassStatus;
  holder?: string;
  claimStart: number;
  /** The real deadline: the claim window, or the grace once the winner left the room. */
  claimEnd: number;
  /** Set when the holder left the room: the spot goes back once the grace runs out. */
  graceFrom?: number;
  /** Everyone who held this spot and lost it, with why. */
  history: { id: string; reason: "passed_on" | "timeout" | "left"; why: string }[];
}

export interface Line {
  id: string;
  text: string;
  tone: "plain" | "good" | "bad";
}

export interface Reaction {
  id: string;
  personId: string;
  emoji: string;
  dx: number;
}

/** A "so-and-so joined" pop-up. Lives a few seconds, like a reaction. */
export interface JoinToast {
  id: string;
  personId: string;
}

/** How long a join pop-up stays up, in milliseconds. */
export const TOAST_MS = 3600;

export interface Banner {
  text: string;
  tone: "plain" | "accent" | "good" | "bad";
}

/** The visitor's own pass, once claimed: the link, and whether they said it worked. */
export interface Mine {
  url: string;
  code: string;
  passId: string;
  outcome: string;
}

export interface View {
  /** Now, in seconds, on the server's clock. */
  t: number;
  drawAt: number;
  claim: number;
  test: boolean;
  /** A show: the whole line was invited, and everyone here has the same chance. */
  everyone: boolean;
  /** Watching, not playing: the operator, or the recorder filming it. */
  spectator: boolean;
  links: number;
  drawStarted: boolean;
  closed: boolean;
  people: Person[];
  presentCount: number;
  passes: Pass[];
  highlight?: string;
  sweepPass?: number;
  sweepRedraw: boolean;
  /** The draw waiting its turn, so the gap between two sweeps still reads as drawing. */
  nextJob?: { pass: number; redraw: boolean };
  /** Every spot has been through the main draw at least once. */
  mainDone: boolean;
  /** Who a re-draw could land on right now, the visitor included if eligible. */
  eligible: number;
  meEligible: boolean;
  banner: Banner | null;
  lines: Line[];
  reactions: Reaction[];
  toasts: JoinToast[];
  me?: Person;
  meEverWon: boolean;
  mine?: Mine;
}
