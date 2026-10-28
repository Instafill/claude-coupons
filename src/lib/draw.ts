import crypto from "crypto";
import { Document, Types } from "mongoose";

import { SessionUser } from "@/lib/auth";
import { DealSlug, dealLink, getDeal } from "@/lib/deals";
import {
  CLAIM_SECONDS,
  GRACE_SECONDS,
  MAIN_SWEEP_MS,
  PAUSE_MS,
  PRESENT_MS,
  REACTIONS,
  REDRAW_SWEEP_MS,
} from "@/lib/drawRules";
import { logEvent } from "@/lib/events";
import { Geo, readGeo } from "@/lib/geo";
import { dbConnect } from "@/lib/mongodb";
import { containsBlockedCodeWord, dealFilter, heldRetirement, recordUnlock } from "@/lib/passes";
import { flagOf, placeFor, readCoords, type Place } from "@/lib/places";
import { demoteNoShows, ensureEnterTokens, frontOfLine, leaveQueue } from "@/lib/queue";
import { sendDrawInvites } from "@/lib/sendgrid";
import { enterUrl, stopUrl } from "@/lib/watchers";
import Draw, { DRAW_STATUS, IDraw, IFeedItem, ISpot, ReleaseReason, SPOT_STATUS } from "@/models/Draw";
import DrawEntrant, { IDrawEntrant } from "@/models/DrawEntrant";
import Membership from "@/models/Membership";
import Pass, { IPass, PASS_STATUS } from "@/models/Pass";
import Unlock from "@/models/Unlock";
import Watcher from "@/models/Watcher";

// The live draw. Held listings (app/actions.ts) are given out one use at a time to people in
// a room, at a set time, instead of being mailed down the line in waves. The front of the
// line is invited; whoever is in the room when the countdown ends is in the draw; each spot
// is swept to a winner who has a minute to claim it; a spot that comes back is re-drawn at
// once among the people still there.
//
// There is no scheduler for any of that. Every open room asks for news every two seconds and
// each ask runs advance(), which moves the draw along by whatever has come due - the same way
// page loads turn the wave clock. Two asks in the same instant both compute the next state;
// the write is conditional on `rev`, so only one lands and the other re-reads.
//
// Everything a draw does is logged as "[event] draw_*", and a closing check runs over the
// stored rows when it ends ("draw_check"), so a real draw can be audited afterwards.

/** The daily draw, in UTC. 14:00 is 10:00 in New York, 16:00 in Berlin, 19:30 in Delhi. */
export const DRAW_HOUR_UTC = 14;
/** How long before it the invites go out: the cron in vercel.json runs at 12:00 UTC. */
const INVITE_LEAD_HOURS = 2;
// The front of the line is invited this many per spot, never fewer than MIN_INVITES. Alerts
// went unopened about seven times in ten, and fewer still turn up at a set time.
const INVITES_PER_SPOT = 15;
const MIN_INVITES = 50;
// How much of the record a room is sent. The banner and activity list need only the latest.
const FEED_KEPT = 40;
const REACTIONS_KEPT = 40;
const REACTION_GAP_MS = 400;
// Slack for the closing check's deadline test: a claim is decided by the server's own clock,
// so this only covers the time between reading the clock and writing the row.
const CLAIM_SLACK_MS = 2000;
const MAX_WRITE_ATTEMPTS = 6;
/** Test draws' codes carry this, and a real draw never takes a listing that does, so a test
    can neither hand out nor hold up a real link. */
export const TEST_CODE_PREFIX = "TESTDRAW-";

type LeanDraw = Omit<IDraw, keyof Document> & { _id: Types.ObjectId };
type LeanEntrant = Omit<IDrawEntrant, keyof Document> & { _id: Types.ObjectId };
type EventData = Record<string, string | number | boolean>;

/** Uses a listing has left: one spot each. */
function usesLeft(pass: { deal?: DealSlug; unlockCount: number }): number {
  return getDeal(pass.deal).unlocksPerListing - pass.unlockCount;
}

// ---- the state machine --------------------------------------------------------------------

/** One attempt at changing a draw. Logs and side effects wait until the write has landed. */
interface Ctx {
  now: Date;
  people: Map<string, LeanEntrant>;
  events: [string, EventData][];
  effects: (() => Promise<void>)[];
}

function present(ctx: Ctx, userId: string | undefined): boolean {
  const person = userId ? ctx.people.get(userId) : undefined;
  return !!person && !person.leftAt && ctx.now.getTime() - new Date(person.lastSeenAt).getTime() <= PRESENT_MS;
}

/** When someone stopped being in the room: their goodbye, or the end of their last check-in. */
function goneSince(ctx: Ctx, userId: string): number {
  const person = ctx.people.get(userId);
  if (!person) return ctx.now.getTime();
  return person.leftAt
    ? new Date(person.leftAt).getTime()
    : new Date(person.lastSeenAt).getTime() + PRESENT_MS;
}

/** Who a sweep could land on: in the room, and never a winner of this draw before. */
function eligible(draw: LeanDraw, ctx: Ctx): string[] {
  const taken = new Set<string>(draw.awards.map((a) => a.userId));
  return [...ctx.people.values()]
    .filter((p) => !taken.has(p.userId) && present(ctx, p.userId))
    .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime())
    .map((p) => p.userId);
}

function presentCount(ctx: Ctx): number {
  return [...ctx.people.keys()].filter((id) => present(ctx, id)).length;
}

function event(draw: LeanDraw, ctx: Ctx, name: string, data: EventData): void {
  ctx.events.push([name, { draw: draw._id.toString(), ...data }]);
}

function feed(draw: LeanDraw, ctx: Ctx, item: Omit<IFeedItem, "id" | "at">): void {
  draw.feedSeq += 1;
  draw.feed = [...draw.feed, { id: draw.feedSeq, at: ctx.now, ...item }].slice(-FEED_KEPT);
}

function spotLink(draw: LeanDraw, spot: ISpot): number {
  return draw.passIds.findIndex((id) => id.equals(spot.passId)) + 1;
}

/** When a claim runs out: the window, or the grace once the winner has left the room. */
function deadline(spot: ISpot): number {
  const end = new Date(spot.claimEnd!).getTime();
  return spot.graceFrom ? Math.min(end, new Date(spot.graceFrom).getTime() + GRACE_SECONDS * 1000) : end;
}

function startJob(draw: LeanDraw, ctx: Ctx, job: { spot: number; redraw: boolean }): void {
  const spot = draw.spots.find((s) => s.n === job.spot)!;
  const candidates = eligible(draw, ctx);
  const now = ctx.now.getTime();
  if (!candidates.length) {
    spot.status = SPOT_STATUS.unclaimed;
    draw.nextJobAt = ctx.now;
    feed(draw, ctx, { kind: "unfilled", spot: spot.n });
    event(draw, ctx, "draw_spot_unfilled", { spot: spot.n, present: presentCount(ctx) });
    return;
  }

  // The winner is decided here, by the server, once. Everything after is the show: a
  // highlight that flicks across the room and slows down the way a wheel runs down (step k
  // lands at D*(k/K)^2) and stops on the person already chosen.
  const target = candidates[crypto.randomInt(candidates.length)];
  const duration = job.redraw ? REDRAW_SWEEP_MS : MAIN_SWEEP_MS;
  const count = candidates.length === 1 ? 1 : job.redraw ? 12 : 24;
  const steps: { at: Date; userId: string }[] = [];
  let previous = "";
  for (let k = 1; k <= count; k++) {
    let id = target;
    if (k < count) {
      do id = candidates[crypto.randomInt(candidates.length)];
      while (id === previous && candidates.length > 1);
    }
    steps.push({ at: new Date(now + duration * (k / count) ** 2), userId: id });
    previous = id;
  }
  spot.status = SPOT_STATUS.drawing;
  draw.sweep = {
    spot: spot.n,
    redraw: job.redraw,
    start: ctx.now,
    end: new Date(now + duration),
    candidates: candidates.length,
    steps,
  };
  feed(draw, ctx, { kind: "sweep", spot: spot.n, redraw: job.redraw, candidates: candidates.length });
  event(draw, ctx, "draw_sweep", { spot: spot.n, redraw: job.redraw, candidates: candidates.length });
}

function award(draw: LeanDraw, ctx: Ctx): void {
  const sweep = draw.sweep!;
  draw.sweep = undefined;
  const spot = draw.spots.find((s) => s.n === sweep.spot)!;
  const winner = sweep.steps[sweep.steps.length - 1].userId;
  spot.status = SPOT_STATUS.claiming;
  spot.holder = winner;
  // From now, not from when the sweep was due to land: if nobody asked for news for a few
  // seconds, the winner still gets the whole minute from the moment it can be shown.
  spot.claimStart = ctx.now;
  spot.claimEnd = new Date(ctx.now.getTime() + draw.claimSeconds * 1000);
  spot.graceFrom = undefined;
  draw.awards.push({ spot: spot.n, userId: winner, at: ctx.now, sweepStart: sweep.start });
  draw.nextJobAt = new Date(ctx.now.getTime() + PAUSE_MS);
  feed(draw, ctx, { kind: "won", spot: spot.n, userId: winner, redraw: sweep.redraw });
  event(draw, ctx, "draw_won", {
    spot: spot.n,
    link: spotLink(draw, spot),
    user: winner,
    redraw: sweep.redraw,
    round: spot.history.length + 1,
    present: present(ctx, winner),
  });
}

function release(draw: LeanDraw, ctx: Ctx, spot: ISpot, reason: ReleaseReason): void {
  const holder = spot.holder!;
  event(draw, ctx, "draw_released", {
    spot: spot.n,
    user: holder,
    reason,
    heldSeconds: Math.round((ctx.now.getTime() - new Date(spot.claimStart!).getTime()) / 100) / 10,
  });
  spot.history.push({ userId: holder, reason, at: ctx.now });
  spot.holder = undefined;
  spot.graceFrom = undefined;
  spot.claimStart = undefined;
  spot.claimEnd = undefined;
  spot.status = SPOT_STATUS.pending;
  // Straight back into the draw: no second countdown, the room is already here.
  draw.jobs.push({ spot: spot.n, redraw: true });
  const soon = new Date(ctx.now.getTime() + 600);
  draw.nextJobAt = draw.nextJobAt && draw.nextJobAt < soon ? draw.nextJobAt : soon;
  feed(draw, ctx, { kind: "released", spot: spot.n, userId: holder, reason });
}

function followClaim(draw: LeanDraw, ctx: Ctx, spot: ISpot): boolean {
  const here = present(ctx, spot.holder);
  let changed = false;
  if (!here && !spot.graceFrom) {
    // From when they went, not from when the server noticed: a room nobody asked about for a
    // while settles on the next ask instead of granting a fresh grace.
    spot.graceFrom = new Date(Math.max(goneSince(ctx, spot.holder!), new Date(spot.claimStart!).getTime()));
    feed(draw, ctx, { kind: "winner_left", spot: spot.n, userId: spot.holder });
    event(draw, ctx, "draw_winner_left", { spot: spot.n, user: spot.holder!, graceSeconds: GRACE_SECONDS });
    changed = true;
  } else if (here && spot.graceFrom) {
    // Back inside the grace (a reload, a dropped connection): the spot is still theirs.
    spot.graceFrom = undefined;
    feed(draw, ctx, { kind: "winner_back", spot: spot.n, userId: spot.holder });
    event(draw, ctx, "draw_winner_back", { spot: spot.n, user: spot.holder! });
    changed = true;
  }
  if (ctx.now.getTime() >= deadline(spot)) {
    release(draw, ctx, spot, spot.graceFrom ? "left" : "timeout");
    changed = true;
  }
  return changed;
}

/** Moves a draw along by everything that has come due. Returns whether anything changed. */
function advance(draw: LeanDraw, ctx: Ctx): boolean {
  let changed = false;
  if (draw.status === DRAW_STATUS.open && ctx.now >= new Date(draw.drawAt)) {
    draw.status = DRAW_STATUS.drawing;
    draw.startedAt = ctx.now;
    draw.jobs = draw.spots.filter((s) => s.status === SPOT_STATUS.pending).map((s) => ({ spot: s.n, redraw: false }));
    draw.nextJobAt = ctx.now;
    event(draw, ctx, "draw_started", {
      present: presentCount(ctx),
      joined: ctx.people.size,
      invited: draw.invited.length,
      eligible: eligible(draw, ctx).length,
    });
    changed = true;
  }
  if (draw.status !== DRAW_STATUS.drawing) return changed;

  // Bounded: one pass can land a sweep, start the next and expire a claim, but a draw can
  // never need more steps than it has spots, re-draws included.
  for (let guard = 0; guard < 4 * draw.spots.length + 4; guard++) {
    let moved = false;
    if (draw.sweep && ctx.now >= new Date(draw.sweep.end)) {
      award(draw, ctx);
      moved = true;
    }
    // With nobody left to draw for there is no show to pause for: the spot settles at once.
    const due = !draw.nextJobAt || ctx.now >= new Date(draw.nextJobAt) || !eligible(draw, ctx).length;
    if (!draw.sweep && draw.jobs.length && due) {
      startJob(draw, ctx, draw.jobs.shift()!);
      moved = true;
    }
    for (const spot of draw.spots) {
      if (spot.status === SPOT_STATUS.claiming && followClaim(draw, ctx, spot)) moved = true;
    }
    if (!moved) break;
    changed = true;
  }

  const settled = draw.spots.every((s) => s.status === SPOT_STATUS.claimed || s.status === SPOT_STATUS.unclaimed);
  if (!draw.sweep && !draw.jobs.length && settled) {
    const claimed = draw.spots.filter((s) => s.status === SPOT_STATUS.claimed).length;
    const stillEligible = eligible(draw, ctx).length;
    draw.status = DRAW_STATUS.closed;
    draw.closedAt = ctx.now;
    feed(draw, ctx, { kind: "closed", claimed });
    event(draw, ctx, "draw_closed", {
      claimed,
      spots: draw.spots.length,
      redraws: draw.spots.reduce((n, s) => n + s.history.length, 0),
      joined: ctx.people.size,
      present: presentCount(ctx),
      invited: draw.invited.length,
    });
    const id = draw._id;
    ctx.effects.push(() => retireSpentPasses(id));
    ctx.effects.push(() => runCheck(id, stillEligible));
    changed = true;
  }
  return changed;
}

// The fields advance() and its callers may change. Everything else on the row is either
// fixed at creation or, like reactions, written outside the revision.
const STATE_FIELDS = [
  "status",
  "spots",
  "jobs",
  "nextJobAt",
  "sweep",
  "awards",
  "feed",
  "feedSeq",
  "startedAt",
  "closedAt",
] as const;

async function load(id: Types.ObjectId | string) {
  const [draw, entrants] = await Promise.all([
    Draw.findById(id).lean<LeanDraw>(),
    DrawEntrant.find({ drawId: id }).lean<LeanEntrant[]>(),
  ]);
  return { draw, entrants };
}

/**
 * Reads a draw, lets `change` move it, and writes it back if nothing else moved it first.
 * `change` may run more than once, so it must decide everything from the row it is handed;
 * what it wants logged or done goes through ctx and happens only after its write lands.
 */
async function mutate(
  id: Types.ObjectId | string,
  change: (draw: LeanDraw, ctx: Ctx) => boolean,
  { retry = true }: { retry?: boolean } = {}
): Promise<{ draw: LeanDraw; entrants: LeanEntrant[] } | null> {
  await dbConnect();
  for (let attempt = 0; attempt < (retry ? MAX_WRITE_ATTEMPTS : 1); attempt++) {
    const { draw, entrants } = await load(id);
    if (!draw) return null;
    const ctx: Ctx = {
      now: new Date(),
      people: new Map(entrants.map((e) => [e.userId, e])),
      events: [],
      effects: [],
    };
    if (!change(draw, ctx)) return { draw, entrants };

    const $set: Record<string, unknown> = {};
    const $unset: Record<string, ""> = {};
    for (const field of STATE_FIELDS) {
      if (draw[field] === undefined) $unset[field] = "";
      else $set[field] = draw[field];
    }
    const written = await Draw.updateOne(
      { _id: draw._id, rev: draw.rev },
      { $set, ...(Object.keys($unset).length ? { $unset } : {}), $inc: { rev: 1 } }
    );
    if (!written.modifiedCount) continue;

    draw.rev += 1;
    for (const [name, data] of ctx.events) logEvent(name, data);
    for (const effect of ctx.effects) {
      try {
        await effect();
      } catch (error) {
        console.error("Draw side effect failed:", error);
      }
    }
    return { draw, entrants };
  }
  // Lost every race: someone else has been moving it, which is what this call wanted anyway.
  const { draw, entrants } = await load(id);
  return draw ? { draw, entrants } : null;
}

/**
 * Brings a draw up to date. Called on every ask from an open room, so when fifty pages ask in
 * the same second, the one whose write lands has done the work for all of them: the others
 * read its result rather than racing to redo it.
 */
export async function advanceDraw(id: string) {
  return mutate(id, (draw, ctx) => advance(draw, ctx), { retry: false });
}

// ---- what a room's visitors do ------------------------------------------------------------

/** Lets one person in: invited to this draw, by the address their session proved. */
function invitedTo(draw: Pick<LeanDraw, "invited">, user: SessionUser | null): boolean {
  return !!user && draw.invited.includes(user.email.toLowerCase());
}

/** What the room will show of a typed name: the first word, letters only, or nothing. */
export function cleanName(raw: unknown): string {
  const first = String(raw ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}' -]/gu, "")
    .trim()
    .split(/\s+/)[0]
    ?.slice(0, 20);
  if (!first || containsBlockedCodeWord(first)) return "";
  return first;
}

export type DrawResult = { ok: true } | { ok: false; error: string; status: number };

export async function joinDraw(
  id: string,
  user: SessionUser,
  input: { name: unknown; usePhoto: unknown },
  place: Place
): Promise<DrawResult> {
  await dbConnect();
  const draw = await Draw.findById(id).lean<LeanDraw>();
  if (!draw) return { ok: false, error: "This draw doesn't exist.", status: 404 };
  if (!invitedTo(draw, user)) return { ok: false, error: "This draw is for the people invited to it.", status: 403 };
  if (draw.status === DRAW_STATUS.closed) return { ok: false, error: "This draw is over.", status: 409 };
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "Add your first name, then press Join.", status: 400 };

  const now = new Date();
  const result = await DrawEntrant.updateOne(
    { drawId: draw._id, userId: user.id },
    {
      $set: {
        name,
        picture: input.usePhoto && user.picture ? user.picture : undefined,
        city: place.city,
        country: place.country,
        lat: place.lat,
        lon: place.lon,
        lastSeenAt: now,
      },
      $unset: { leftAt: "" },
      $setOnInsert: { email: user.email.toLowerCase(), joinedAt: now },
    },
    { upsert: true }
  );
  if (result.upsertedCount) {
    // They showed up, which is the opposite of sleeping at the front of the line.
    if (!draw.test) {
      await Membership.updateOne(
        { email: user.email.toLowerCase(), deal: draw.deal },
        { $set: { offersSinceUnlock: 0 } }
      );
    }
    logEvent("draw_joined", {
      draw: id,
      user: user.id,
      country: place.country,
      beforeDraw: draw.status === DRAW_STATUS.open,
      photo: Boolean(input.usePhoto && user.picture),
    });
  }
  return { ok: true };
}

/** A new name or picture from the visitor's own tile. Their place in the room is untouched. */
export async function editEntrant(
  id: string,
  user: SessionUser,
  input: { name: unknown; usePhoto: unknown }
): Promise<DrawResult> {
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "Add your first name.", status: 400 };
  await dbConnect();
  const picture = input.usePhoto && user.picture ? user.picture : undefined;
  const result = await DrawEntrant.updateOne(
    { drawId: id, userId: user.id },
    picture ? { $set: { name, picture } } : { $set: { name }, $unset: { picture: "" } }
  );
  if (!result.matchedCount) return { ok: false, error: "Join the draw first.", status: 409 };
  logEvent("draw_profile_changed", { draw: id, user: user.id, photo: Boolean(picture) });
  return { ok: true };
}

/**
 * Where to pin someone who is joining: what the edge says about this request, else (on
 * localhost, where it says nothing) where we last saw them, else their browser's time zone.
 */
export async function placeForRequest(email: string, headers: Headers, zone?: string): Promise<Place> {
  const geo = readGeo(headers);
  if (geo.city || geo.country) return placeFor(geo, readCoords(headers), zone);
  await dbConnect();
  const watcher = await Watcher.findOne({ email: email.toLowerCase() })
    .select("city country region timezone")
    .lean<Geo>();
  return placeFor(watcher ?? {}, null, zone);
}

/** "Still here." Written at most every few seconds, and at once after a goodbye. */
export async function heartbeat(id: string, userId: string): Promise<void> {
  const now = new Date();
  await DrawEntrant.updateOne(
    {
      drawId: id,
      userId,
      $or: [{ lastSeenAt: { $lt: new Date(now.getTime() - 5000) } }, { leftAt: { $exists: true } }],
    },
    { $set: { lastSeenAt: now }, $unset: { leftAt: "" } }
  );
}

/** The page said goodbye. A winner's grace starts on the next advance. */
export async function leaveDraw(id: string, userId: string): Promise<void> {
  await dbConnect();
  const left = await DrawEntrant.updateOne(
    { drawId: id, userId, leftAt: { $exists: false } },
    { $set: { leftAt: new Date() } }
  );
  if (left.modifiedCount) logEvent("draw_left", { draw: id, user: userId });
}

export async function react(id: string, userId: string, emoji: unknown): Promise<void> {
  if (typeof emoji !== "string" || !REACTIONS.includes(emoji)) return;
  await dbConnect();
  if (!(await DrawEntrant.exists({ drawId: id, userId }))) return;
  const now = new Date();
  // One at a time per person: a held-down button is a few reactions, not a flood.
  await Draw.updateOne(
    {
      _id: id,
      status: { $ne: DRAW_STATUS.closed },
      reactions: { $not: { $elemMatch: { userId, at: { $gt: new Date(now.getTime() - REACTION_GAP_MS) } } } },
    },
    {
      $push: {
        reactions: {
          $each: [{ id: crypto.randomBytes(6).toString("hex"), at: now, userId, emoji }],
          $slice: -REACTIONS_KEPT,
        },
      },
    }
  );
}

export type ClaimResult =
  { ok: true; url: string; code: string; passId: string } | { ok: false; error: string; status: number };

/** "Get my pass." Decided by the server's clock: a press after the deadline finds the spot gone. */
export async function claimSpot(id: string, user: SessionUser, ipHash: string): Promise<ClaimResult> {
  // Assigned inside mutate's callback, which TypeScript cannot follow.
  let won = undefined as ISpot | undefined;
  const result = await mutate(id, (draw, ctx) => {
    won = undefined;
    const moved = advance(draw, ctx);
    const spot = draw.spots.find((s) => s.holder === user.id && s.status === SPOT_STATUS.claiming);
    if (!spot) return moved;
    spot.status = SPOT_STATUS.claimed;
    spot.claimedAt = ctx.now;
    spot.graceFrom = undefined;
    won = spot;
    feed(draw, ctx, { kind: "claimed", spot: spot.n, userId: user.id });
    event(draw, ctx, "draw_claimed", {
      spot: spot.n,
      link: spotLink(draw, spot),
      user: user.id,
      afterSeconds: Math.round((ctx.now.getTime() - new Date(spot.claimStart!).getTime()) / 100) / 10,
    });
    // The same record an unlock leaves, so the stats, the "did it work?" answer and the
    // listing's retirement all work as they always have.
    const passId = spot.passId.toString();
    ctx.effects.push(async () => {
      await recordUnlock(passId, user.id, draw.deal, ipHash);
      if (!draw.test) await leaveQueue(user.email, draw.deal);
    });
    // Advancing again closes the room if this was the last spot.
    advance(draw, ctx);
    return true;
  });
  if (!result) return { ok: false, error: "This draw doesn't exist.", status: 404 };
  if (!won) return { ok: false, error: "This spot isn't yours to claim any more.", status: 409 };
  const pass = await Pass.findById(won.passId);
  if (!pass) return { ok: false, error: "This pass is gone.", status: 410 };
  const deal = getDeal(pass.deal);
  return { ok: true, url: dealLink(deal, pass.code), code: pass.code, passId: pass._id.toString() };
}

/** "Pass it on": the spot goes straight back to the room. */
export async function passOnSpot(id: string, user: SessionUser): Promise<DrawResult> {
  let released = false as boolean;
  const result = await mutate(id, (draw, ctx) => {
    released = false;
    const moved = advance(draw, ctx);
    const spot = draw.spots.find((s) => s.holder === user.id && s.status === SPOT_STATUS.claiming);
    if (!spot) return moved;
    release(draw, ctx, spot, "passed_on");
    released = true;
    return true;
  });
  if (!result) return { ok: false, error: "This draw doesn't exist.", status: 404 };
  return released ? { ok: true } : { ok: false, error: "There's no spot of yours to pass on.", status: 409 };
}

// ---- what a room is shown -----------------------------------------------------------------

export interface DrawView {
  /** The server's clock, so every page counts down to the same second. */
  now: number;
  id: string;
  status: string;
  test: boolean;
  drawAt: number;
  claimSeconds: number;
  links: number;
  invited: number;
  spots: {
    n: number;
    link: number;
    status: string;
    holder?: string;
    claimStart?: number;
    /** The real deadline: the window, or the grace once the winner left. */
    claimEnd?: number;
    graceFrom?: number;
    history: { id: string; reason: ReleaseReason }[];
  }[];
  sweep?: {
    spot: number;
    redraw: boolean;
    start: number;
    end: number;
    candidates: number;
    steps: { at: number; id: string }[];
  };
  jobs: { spot: number; redraw: boolean }[];
  /** When the next sweep may start, so a page can ask for news right then. */
  nextJobAt?: number;
  people: {
    id: string;
    name: string;
    picture?: string;
    seed: string;
    city: string;
    country: string;
    flag: string;
    lat: number;
    lon: number;
    joinedAt: number;
    present: boolean;
  }[];
  feed: {
    id: number;
    at: number;
    kind: string;
    spot?: number;
    who?: string;
    reason?: string;
    redraw?: boolean;
    candidates?: number;
    claimed?: number;
  }[];
  reactions: { id: string; at: number; who: string; emoji: string }[];
  eligible: number;
  viewer: {
    invited: boolean;
    /** Their tile's id once they have joined. */
    id?: string;
    eligible: boolean;
    everWon: boolean;
    /** Their pass, once they have claimed one: the link, and whether they said it worked. */
    mine?: { url: string; code: string; passId: string; outcome: string };
  };
}

/**
 * The room as one visitor sees it. People are named by their tile id, never by account or
 * address, and a pass's link is only ever in the view of the person who claimed it.
 */
export async function drawView(draw: LeanDraw, entrants: LeanEntrant[], user: SessionUser | null): Promise<DrawView> {
  const ctx: Ctx = { now: new Date(), people: new Map(entrants.map((e) => [e.userId, e])), events: [], effects: [] };
  const tile = new Map(entrants.map((e) => [e.userId, e._id.toString()]));
  const who = (userId?: string) => (userId ? (tile.get(userId) ?? "gone") : undefined);
  const ms = (date?: Date) => (date ? new Date(date).getTime() : undefined);
  const free = eligible(draw, ctx);

  const viewer: DrawView["viewer"] = {
    invited: invitedTo(draw, user),
    eligible: !!user && free.includes(user.id),
    everWon: !!user && draw.awards.some((a) => a.userId === user.id),
  };
  if (user && tile.has(user.id)) viewer.id = tile.get(user.id);
  const claimedSpot = user && draw.spots.find((s) => s.holder === user.id && s.status === SPOT_STATUS.claimed);
  if (user && claimedSpot) {
    const [pass, unlock] = await Promise.all([
      Pass.findById(claimedSpot.passId),
      Unlock.findOne({ passId: claimedSpot.passId, userId: new Types.ObjectId(user.id) }),
    ]);
    if (pass) {
      viewer.mine = {
        url: dealLink(getDeal(pass.deal), pass.code),
        code: pass.code,
        passId: pass._id.toString(),
        outcome: unlock?.outcome ?? "none",
      };
    }
  }

  const cutoff = ctx.now.getTime() - 3000;
  return {
    now: ctx.now.getTime(),
    id: draw._id.toString(),
    status: draw.status,
    test: draw.test,
    drawAt: new Date(draw.drawAt).getTime(),
    claimSeconds: draw.claimSeconds,
    links: draw.passIds.length,
    invited: draw.invited.length,
    spots: draw.spots.map((s) => ({
      n: s.n,
      link: spotLink(draw, s),
      status: s.status,
      holder: who(s.holder),
      claimStart: ms(s.claimStart),
      claimEnd: s.status === SPOT_STATUS.claiming ? deadline(s) : undefined,
      graceFrom: ms(s.graceFrom),
      history: s.history.map((h) => ({ id: who(h.userId)!, reason: h.reason })),
    })),
    sweep: draw.sweep && {
      spot: draw.sweep.spot,
      redraw: draw.sweep.redraw,
      start: ms(draw.sweep.start)!,
      end: ms(draw.sweep.end)!,
      candidates: draw.sweep.candidates,
      steps: draw.sweep.steps.map((step) => ({ at: ms(step.at)!, id: who(step.userId)! })),
    },
    jobs: draw.jobs.map((j) => ({ spot: j.spot, redraw: j.redraw })),
    nextJobAt: ms(draw.nextJobAt),
    people: entrants
      .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime())
      .map((e) => ({
        id: e._id.toString(),
        name: e.name,
        picture: e.picture,
        seed: seedFor(draw._id.toString(), e.userId),
        city: e.city,
        country: e.country,
        flag: flagOf(e.country),
        lat: e.lat,
        lon: e.lon,
        joinedAt: ms(e.joinedAt)!,
        present: present(ctx, e.userId),
      })),
    feed: draw.feed.map((f) => ({
      id: f.id,
      at: ms(f.at)!,
      kind: f.kind,
      spot: f.spot,
      who: who(f.userId),
      reason: f.reason,
      redraw: f.redraw,
      candidates: f.candidates,
      claimed: f.claimed,
    })),
    reactions: (draw.reactions ?? [])
      .filter((r) => new Date(r.at).getTime() > cutoff)
      .map((r) => ({ id: r.id, at: ms(r.at)!, who: who(r.userId)!, emoji: r.emoji })),
    eligible: free.length,
    viewer,
  };
}

/**
 * The seed of someone's identicon in one room. Known before they join, so the face in the join
 * form is the face on their tile; a hash, so nothing about the account can be read back out.
 */
export function seedFor(drawId: string, userId: string): string {
  return crypto.createHash("sha256").update(`${drawId}:${userId}`).digest("hex").slice(0, 16);
}

/** The room's view for this visitor, after bringing the draw up to date and noting they're here. */
export async function roomFor(id: string, user: SessionUser | null): Promise<DrawView | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  await dbConnect();
  // Side by side: the check-in only has to land before the next ask, not before this one.
  const [, result] = await Promise.all([user ? heartbeat(id, user.id) : null, advanceDraw(id)]);
  if (!result) return null;
  return drawView(result.draw, result.entrants, user);
}

// ---- opening a draw -----------------------------------------------------------------------

/** Today's draw time, or tomorrow's once today's has passed. */
export function nextDrawAt(now: Date = new Date()): Date {
  const at = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), DRAW_HOUR_UTC));
  if (at <= now) at.setUTCDate(at.getUTCDate() + 1);
  return at;
}

/**
 * The draw a listing made now would go to: today's, if its invites haven't gone out yet
 * (the cron opens it), else tomorrow's.
 */
export function nextScheduledDraw(now: Date = new Date()): Date {
  const at = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), DRAW_HOUR_UTC));
  if (now.getTime() >= at.getTime() - INVITE_LEAD_HOURS * 60 * 60 * 1000) at.setUTCDate(at.getUTCDate() + 1);
  return at;
}

/** How many people a draw of this many spots invites from the front of the line. */
export function invitesFor(spots: number): number {
  return Math.max(MIN_INVITES, spots * INVITES_PER_SPOT);
}

/** What a board shows about its draws: the next one, what is waiting, and the last result. */
export interface DrawSummary {
  next?: { id: string; status: string; drawAt: number; spots: number; links: number; invited: number; youreInvited: boolean };
  /** Held listings not yet in a draw, and the spots they make. */
  waiting: { links: number; spots: number };
  last?: { closedAt: number; claimed: number; spots: number; joined: number };
  /** How many the next draw would invite, as things stand. */
  invites: number;
  nextScheduled: number;
}

export async function drawSummary(deal: DealSlug, email?: string): Promise<DrawSummary> {
  await dbConnect();
  const [open, last, held] = await Promise.all([
    Draw.findOne({ deal, test: false, status: { $ne: DRAW_STATUS.closed } })
      .sort({ drawAt: 1 })
      .select("drawAt status spots passIds invited")
      .lean<LeanDraw>(),
    Draw.findOne({ deal, test: false, status: DRAW_STATUS.closed })
      .sort({ closedAt: -1 })
      .select("closedAt spots")
      .lean<LeanDraw>(),
    Pass.find({ status: PASS_STATUS.held, ...dealFilter(deal), code: { $not: new RegExp(`^${TEST_CODE_PREFIX}`) } }),
  ]);
  // A room that everyone left hours ago would otherwise read "on now" until the cron settles it.
  let next = open;
  if (open && new Date(open.drawAt).getTime() < Date.now() - 30 * 60 * 1000) {
    const settled = await advanceDraw(open._id.toString());
    if (settled?.draw.status === DRAW_STATUS.closed) next = null;
  }

  const inNext = new Set((next?.passIds ?? []).map((id) => id.toString()));
  const waitingPasses = held.filter((p) => !inNext.has(p._id.toString()) && !heldRetirement(p) && usesLeft(p) > 0);
  const waitingSpots = waitingPasses.reduce((n, p) => n + usesLeft(p), 0);
  return {
    next: next
      ? {
          id: next._id.toString(),
          status: next.status,
          drawAt: new Date(next.drawAt).getTime(),
          spots: next.spots.length,
          links: next.passIds.length,
          invited: next.invited.length,
          youreInvited: !!email && next.invited.includes(email.toLowerCase()),
        }
      : undefined,
    waiting: { links: waitingPasses.length, spots: waitingSpots },
    last: last
      ? {
          closedAt: new Date(last.closedAt!).getTime(),
          claimed: last.spots.filter((s) => s.status === SPOT_STATUS.claimed).length,
          spots: last.spots.length,
          joined: await DrawEntrant.countDocuments({ drawId: last._id }),
        }
      : undefined,
    invites: invitesFor(waitingSpots || getDeal(deal).unlocksPerListing),
    nextScheduled: nextScheduledDraw().getTime(),
  };
}

export type OpenResult = { draw: LeanDraw; created: boolean; delivered: number } | { draw: null; reason: string };

/**
 * Opens a draw: every held listing with uses left becomes spots, the front of the line is
 * invited, and the invites go out. Idempotent per slot - a second call finds the first draw.
 *
 * A test draw is given its codes and its addresses instead. It invites only those, leaves
 * the line and everyone's place in it alone, and can be opened any time.
 */
export async function openDraw(input: {
  deal: DealSlug;
  drawAt: Date;
  claimSeconds?: number;
  test?: { emails: string[]; codes: string[] };
}): Promise<OpenResult> {
  await dbConnect();
  const { deal, drawAt, test } = input;
  const brand = getDeal(deal);

  if (!test) {
    const existing = await Draw.findOne({ deal, drawAt, test: false }).lean<LeanDraw>();
    if (existing) return { draw: existing, created: false, delivered: 0 };
  }

  let passes: IPass[];
  if (test) {
    passes = [];
    for (const code of test.codes.map((c) => (c.startsWith(TEST_CODE_PREFIX) ? c : `${TEST_CODE_PREFIX}${c}`))) {
      const pass = await Pass.findOneAndUpdate(
        { deal, code },
        { $setOnInsert: { deal, code, status: PASS_STATUS.held } },
        { upsert: true, returnDocument: "after" }
      );
      if (pass) passes.push(pass);
    }
  } else {
    // A listing still being given out in a room that hasn't closed belongs to that room.
    const busy = await Draw.find({ deal, status: { $ne: DRAW_STATUS.closed } }).distinct("passIds");
    passes = await Pass.find({
      status: PASS_STATUS.held,
      ...dealFilter(deal),
      _id: { $nin: busy },
      code: { $not: new RegExp(`^${TEST_CODE_PREFIX}`) },
    }).sort({ createdAt: 1 });
    // A held link people reported dead, or one held past a listing's lifetime, is retired
    // here as the board would retire it, instead of being handed to another room.
    for (const pass of passes) {
      const verdict = heldRetirement(pass);
      if (!verdict) continue;
      await Pass.updateOne({ _id: pass._id, status: PASS_STATUS.held }, { $set: { status: verdict } });
      logEvent("draw_pass_retired", { pass: pass._id.toString(), status: verdict });
    }
    passes = passes.filter((pass) => !heldRetirement(pass));
  }
  passes = passes.filter((pass) => usesLeft(pass) > 0);
  if (!passes.length) return { draw: null, reason: "nothing_held" };

  const spots: ISpot[] = [];
  for (const pass of passes) {
    for (let k = 0; k < usesLeft(pass); k++) {
      spots.push({ n: spots.length + 1, passId: pass._id, status: SPOT_STATUS.pending, history: [] });
    }
  }

  let invitees: { email: string; position?: number }[];
  if (test) {
    invitees = test.emails.map((email) => ({ email: email.trim().toLowerCase() }));
    // Test addresses need a way in, like anyone invited: a confirmed watch row with an enter
    // token. Created if missing; never given a place in any line.
    for (const { email } of invitees) {
      await Watcher.updateOne(
        { email },
        {
          $setOnInsert: {
            email,
            stopToken: crypto.randomBytes(24).toString("hex"),
            confirmedAt: new Date(),
            queueMigratedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }
  } else {
    await demoteNoShows(deal);
    const members = await frontOfLine(deal, invitesFor(spots.length));
    invitees = members.map((m) => ({ email: m.email, position: m.position }));
  }

  let draw;
  try {
    draw = await Draw.create({
      deal,
      drawAt,
      claimSeconds: input.claimSeconds ?? CLAIM_SECONDS,
      test: Boolean(test),
      passIds: passes.map((p) => p._id),
      spots,
      invited: invitees.map((i) => i.email),
    });
  } catch (error) {
    // Two runs raced for the slot. The other one opened it and sent the invites.
    const existing = await Draw.findOne({ deal, drawAt, test: false }).lean<LeanDraw>();
    if (existing) return { draw: existing, created: false, delivered: 0 };
    throw error;
  }
  const id = draw._id.toString();

  const watchers = await Watcher.find({ email: { $in: invitees.map((i) => i.email) }, stoppedAt: { $exists: false } });
  await ensureEnterTokens(watchers);
  const delivered = await sendDrawInvites(
    watchers.map((w) => ({
      email: w.email,
      enterUrl: enterUrl(w.enterToken!, deal, id),
      stopUrl: stopUrl(w.stopToken),
      timezone: w.timezone,
    })),
    brand,
    {
      id,
      drawAt,
      spots: spots.length,
      links: passes.length,
      invited: invitees.length,
      claimSeconds: draw.claimSeconds,
    }
  );
  if (!test && delivered.length) {
    // An invite is an offer, as an alert was: three ignored and the number goes to the back.
    await Membership.updateMany(
      { deal, email: { $in: delivered } },
      { $set: { lastNotifiedAt: new Date() }, $inc: { notifyCount: 1, offersSinceUnlock: 1 } }
    );
  }
  logEvent("draw_opened", {
    draw: id,
    deal,
    test: Boolean(test),
    drawAt: drawAt.toISOString(),
    links: passes.length,
    spots: spots.length,
    invited: invitees.length,
    delivered: delivered.length,
    claimSeconds: draw.claimSeconds,
  });
  return { draw: draw.toObject() as unknown as LeanDraw, created: true, delivered: delivered.length };
}

/**
 * Advances every draw nobody is watching any more. A room only moves while someone has it
 * open, so one that everyone left would otherwise stay "drawing" with its spots held.
 */
export async function settleAbandonedDraws(): Promise<number> {
  await dbConnect();
  const stale = await Draw.find({
    status: { $ne: DRAW_STATUS.closed },
    drawAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) },
  }).select("_id");
  for (const draw of stale) await advanceDraw(draw._id.toString());
  return stale.length;
}

// ---- after a draw closes ------------------------------------------------------------------

/**
 * A listing whose every use went out is finished, and so is one its winners reported dead;
 * one with uses left waits, held, for the next draw.
 */
async function retireSpentPasses(id: Types.ObjectId): Promise<void> {
  const draw = await Draw.findById(id).lean<LeanDraw>();
  if (!draw) return;
  for (const passId of draw.passIds) {
    const pass = await Pass.findById(passId);
    const verdict = pass && heldRetirement(pass);
    if (!pass || !verdict) continue;
    await Pass.updateOne({ _id: pass._id, status: PASS_STATUS.held }, { $set: { status: verdict } });
    logEvent("draw_pass_retired", { draw: id.toString(), pass: pass._id.toString(), status: verdict });
  }
}

// What a finished draw must have done, checked from its stored rows rather than from the
// code that wrote them. Anything in problems is a bug to chase, not a judgement call.
async function runCheck(id: Types.ObjectId, eligibleAtClose: number): Promise<void> {
  const { draw, entrants } = await load(id);
  if (!draw) return;
  const problems: string[] = [];
  const byUser = new Map(entrants.map((e) => [e.userId, e]));

  const wins = new Map<string, number>();
  for (const a of draw.awards) {
    wins.set(a.userId, (wins.get(a.userId) ?? 0) + 1);
    const entrant = byUser.get(a.userId);
    if (!entrant) problems.push(`spot ${a.spot} went to ${a.userId}, who never joined`);
    else {
      if (new Date(entrant.joinedAt) > new Date(a.sweepStart))
        problems.push(`spot ${a.spot} went to ${a.userId}, who joined after its sweep began`);
      if (!draw.invited.includes(entrant.email))
        problems.push(`spot ${a.spot} went to ${a.userId}, who wasn't invited`);
    }
  }
  for (const [user, n] of wins) if (n > 1) problems.push(`${user} won ${n} times`);

  const perPass = new Map<string, number>();
  for (const spot of draw.spots) {
    if (spot.status !== SPOT_STATUS.claimed && spot.status !== SPOT_STATUS.unclaimed)
      problems.push(`spot ${spot.n} still ${spot.status} at close`);
    if (spot.status === SPOT_STATUS.unclaimed && eligibleAtClose)
      problems.push(`spot ${spot.n} unfilled with ${eligibleAtClose} people still eligible`);
    if (spot.status !== SPOT_STATUS.claimed) continue;
    const pass = spot.passId.toString();
    perPass.set(pass, (perPass.get(pass) ?? 0) + 1);
    const unlock = await Unlock.exists({ passId: spot.passId, userId: new Types.ObjectId(spot.holder) });
    if (!unlock) problems.push(`spot ${spot.n} shows claimed with no unlock recorded`);
    if (
      spot.claimedAt &&
      spot.claimEnd &&
      new Date(spot.claimedAt).getTime() > new Date(spot.claimEnd).getTime() + CLAIM_SLACK_MS
    )
      problems.push(`spot ${spot.n} was claimed after its deadline`);
  }
  for (const [passId, n] of perPass) {
    const pass = await Pass.findById(passId);
    const uses = getDeal(pass?.deal).unlocksPerListing;
    if (pass && pass.unlockCount > uses)
      problems.push(`link ${passId} given out ${pass.unlockCount} times, more than ${uses}`);
    if (n > uses) problems.push(`link ${passId} claimed ${n} times in this draw, more than ${uses}`);
  }

  const reasons: Record<string, number> = { passed_on: 0, timeout: 0, left: 0 };
  for (const spot of draw.spots) for (const h of spot.history) reasons[h.reason] = (reasons[h.reason] ?? 0) + 1;

  const check = { ok: !problems.length, problems };
  await Draw.updateOne({ _id: id }, { $set: { check } });
  logEvent("draw_check", {
    draw: id.toString(),
    ok: check.ok,
    problems: problems.join("; ") || "none",
    claimed: draw.spots.filter((s) => s.status === SPOT_STATUS.claimed).length,
    unfilled: draw.spots.filter((s) => s.status === SPOT_STATUS.unclaimed).length,
    passedOn: reasons.passed_on,
    timedOut: reasons.timeout,
    left: reasons.left,
    joined: entrants.length,
    invited: draw.invited.length,
  });
}
