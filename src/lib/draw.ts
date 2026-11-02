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
  CHAT_REACTIONS,
  REACTIONS,
  REDRAW_SWEEP_MS,
} from "@/lib/drawRules";
import { logEvent } from "@/lib/events";
import { Geo, readGeo, repairUtf8 } from "@/lib/geo";
import { dbConnect } from "@/lib/mongodb";
import { containsBlockedCodeWord, dealFilter, heldRetirement, recordUnlock } from "@/lib/passes";
import { flagOf, placeFor, readCoords, type Place } from "@/lib/places";
import { demoteNoShows, ensureEnterTokens, frontOfLine, leaveQueue } from "@/lib/queue";
import { sendDrawInvites } from "@/lib/sendgrid";
import { enterUrl, stopUrl } from "@/lib/watchers";
import Draw, { DRAW_STATUS, IDraw, IFeedItem, ISpot, ReleaseReason, SPOT_STATUS } from "@/models/Draw";
import DrawEntrant, { IDrawEntrant } from "@/models/DrawEntrant";
import DrawMessage, { IDrawMessage, MESSAGE_KIND } from "@/models/DrawMessage";
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
  return person.leftAt ? new Date(person.leftAt).getTime() : new Date(person.lastSeenAt).getTime() + PRESENT_MS;
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
      invited: draw.invitedCount,
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
      invited: draw.invitedCount,
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

// A room's every ask reads the draw, so the long lists - a show invites the whole line - stay
// in the database; who may come in is asked of it directly (accessTo).
const UNREAD_LISTS = "-invited -sent -spectators";

async function load(id: Types.ObjectId | string) {
  const [draw, entrants] = await Promise.all([
    Draw.findById(id).select(UNREAD_LISTS).lean<LeanDraw>(),
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
    const before = { feedSeq: draw.feedSeq, status: draw.status };
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
    // Only the write that landed tells the chat, so a line is never said twice.
    try {
      await postSystem(draw._id, systemLines(draw, ctx, before));
    } catch (error) {
      console.error("Draw chat line failed:", error);
    }
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

/**
 * How someone may be in a room, by the address their session proved: invited (may join and
 * win), a spectator (may watch, never join), or neither. Asked of the database, which hands
 * back at most the one matching address, rather than reading a list as long as the line.
 */
export type Access = "invited" | "spectator" | null;

async function accessTo(id: Types.ObjectId | string, address: string | undefined): Promise<Access> {
  if (!address) return null;
  const email = address.toLowerCase();
  const row = await Draw.findOne(
    { _id: id },
    { invited: { $elemMatch: { $eq: email } }, spectators: { $elemMatch: { $eq: email } } }
  ).lean<{ invited?: string[]; spectators?: string[] }>();
  if (row?.spectators?.length) return "spectator";
  if (row?.invited?.length) return "invited";
  return null;
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
  const draw = await Draw.findById(id).select(UNREAD_LISTS).lean<LeanDraw>();
  if (!draw) return { ok: false, error: "This draw doesn't exist.", status: 404 };
  const access = await accessTo(draw._id, user.email);
  if (access === "spectator")
    return { ok: false, error: "You're watching this one: spectators can't join.", status: 403 };
  if (access !== "invited") return { ok: false, error: "This draw is for the people invited to it.", status: 403 };
  if (draw.status === DRAW_STATUS.closed) return { ok: false, error: "This draw is over.", status: 409 };
  if (draw.opensAt && new Date(draw.opensAt).getTime() > Date.now())
    return { ok: false, error: "The room isn't open yet. Come back when the countdown ends.", status: 409 };
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
    // The arrival goes in the chat, so the room feels people coming in.
    const tile = result.upsertedId?.toString();
    await postSystem(draw._id, [
      { at: now.getTime(), event: "joined", tile, name, text: `👋 ${name} joined from ${place.city}` },
    ]).catch((error) => console.error("Draw chat line failed:", error));
  }
  forget(id);
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
  forget(id);
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

/** The page said goodbye. A winner's grace starts on the next advance. */
export async function leaveDraw(id: string, userId: string): Promise<void> {
  await dbConnect();
  const left = await DrawEntrant.updateOne(
    { drawId: id, userId, leftAt: { $exists: false } },
    { $set: { leftAt: new Date() } }
  );
  if (left.modifiedCount) logEvent("draw_left", { draw: id, user: userId });
  forget(id);
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
  forget(id);
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
  forget(id);
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
  forget(id);
  return released ? { ok: true } : { ok: false, error: "There's no spot of yours to pass on.", status: 409 };
}

// ---- what a room is shown -----------------------------------------------------------------

export interface DrawPerson {
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
}

/** One chat line as a room sees it: the speaker by tile, never by account. */
export interface ChatLine {
  id: string;
  at: number;
  kind: "chat" | "system";
  tile?: string;
  name?: string;
  text: string;
  host?: boolean;
  event?: string;
  /** Taken down by the host: a page that showed it removes it. */
  hidden?: boolean;
}

export interface DrawView {
  /** The server's clock, so every page counts down to the same second. */
  now: number;
  id: string;
  status: string;
  test: boolean;
  drawAt: number;
  /** Announced ahead: the page counts down to this and nobody joins before it. */
  opensAt?: number;
  claimSeconds: number;
  links: number;
  invited: number;
  /** A show: the whole line was invited. */
  everyone: boolean;
  /** Whether anyone can still post: not once the host closed it, nor long after the room closed. */
  chatOpen: boolean;
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
  /** The whole list: on arrival, or when the page's no longer matches. */
  people?: DrawPerson[];
  /** Only the people after those the page already holds. */
  peopleAdded?: DrawPerson[];
  /** How many people, and the hash naming them all: what a page sends back as n and ph. */
  peopleCount: number;
  peopleHash: string;
  /** Tile ids of everyone not in the room just now; everyone else is. */
  absent: string[];
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
  /** The latest chat lines, or those since the page last asked. */
  chat: ChatLine[];
  /** Recent lines the host took down since a page may have shown them: pages drop these. */
  chatHidden: string[];
  /** Reactions on recent lines: line id -> emoji -> how many. */
  chatReactions: Record<string, Record<string, number>>;
  eligible: number;
  viewer: {
    invited: boolean;
    /** May watch, never join. */
    spectator: boolean;
    /** Their tile's id once they have joined. */
    id?: string;
    eligible: boolean;
    everWon: boolean;
    /** Their pass, once they have claimed one: the link, and whether they said it worked. */
    mine?: { url: string; code: string; passId: string; outcome: string };
    /** The emoji this visitor put on recent lines: line id -> emoji. */
    reacted: Record<string, string[]>;
    /** Blocked from the chat by the host. */
    blocked: boolean;
  };
}

// ---- the shared room ----------------------------------------------------------------------
//
// Everything but `viewer` is the same for everyone in a room, so it is built once per beat on
// each server - one read of the draw, its people and its chat - and every ask in that beat is
// answered from memory: no database call on a page's ordinary two-second ask. Its "still here"
// is noted in memory and written with everyone else's in one batch when the next beat is built.
// Anything a visitor does drops the beat at once, so they see it straight away.

const BEAT_MS = 700;
// How many chat lines a room is sent on arrival, and kept in each beat to answer from.
const CHAT_KEPT = 80;
// A page asks for the lines since its newest; this much overlap covers servers whose clocks
// differ by a moment, and the page drops lines it already has.
const CHAT_OVERLAP_MS = 3000;
// Presence is judged over PRESENT_MS, so a check-in is only worth writing once it's this old.
const SEEN_WRITE_MS = 20_000;

type Mine = NonNullable<DrawView["viewer"]["mine"]>;

interface Shared {
  draw: LeanDraw;
  entrants: Map<string, LeanEntrant>;
  tile: Map<string, string>;
  eligible: Set<string>;
  base: Omit<DrawView, "now" | "viewer" | "people" | "peopleAdded" | "chat">;
  /** `base` as JSON without its braces, spliced into every answer instead of re-serialised. */
  baseJson: string;
  people: DrawPerson[];
  peopleJson: string;
  /** prefix[i] names the first i people, so a page that holds them is sent only the rest. */
  prefix: string[];
  chat: ChatLine[];
  /** Who put which emoji on each recent line, to tell each visitor which are theirs. */
  lineReactions: Map<string, { userId: string; emoji: string }[]>;
  /** Each claimed winner's pass, read once per beat rather than on each of their asks. */
  mine: Map<string, Mine>;
}

// A room's beat on this server. `gen` counts what visitors did here since; a beat built at an
// older gen is out of date. While one ask rebuilds it, the others are answered from the last
// one - a moment old at most - instead of all waiting on the database.
interface Beat {
  gen: number;
  builtGen: number;
  at: number;
  askedAt: number;
  ready?: Shared | null;
  building?: { gen: number; promise: Promise<Shared | null> };
}
const beats = new Map<string, Beat>();
// How old a beat may be and still answer while the next is built.
const STALE_OK_MS = 5000;
// Check-ins waiting for the next beat: draw -> user -> when, and whether to clear a goodbye.
const pendingSeen = new Map<string, Map<string, { at: Date; back: boolean }>>();

/** Marks a room's beat out of date: a visitor here just changed something. */
function forget(id: string): void {
  const beat = beats.get(id.toString());
  if (beat) beat.gen += 1;
}

/** Writes the waiting check-ins in one batch. A goodbye said after a check-in is never undone. */
async function flushSeen(id: string): Promise<void> {
  const waiting = pendingSeen.get(id);
  if (!waiting?.size) return;
  pendingSeen.delete(id);
  const drawId = new Types.ObjectId(id);
  await DrawEntrant.bulkWrite(
    [...waiting].flatMap(([userId, { at, back }]) => [
      { updateOne: { filter: { drawId, userId, lastSeenAt: { $lt: at } }, update: { $set: { lastSeenAt: at } } } },
      ...(back
        ? [
            {
              updateOne: {
                filter: { drawId, userId, leftAt: { $lt: at } },
                update: { $unset: { leftAt: "" as const } },
              },
            },
          ]
        : []),
    ]),
    { ordered: false }
  );
}

async function minesFor(draw: LeanDraw): Promise<Map<string, Mine>> {
  const mine = new Map<string, Mine>();
  await Promise.all(
    draw.spots
      .filter((s) => s.status === SPOT_STATUS.claimed && s.holder)
      .map(async (s) => {
        const [pass, unlock] = await Promise.all([
          Pass.findById(s.passId).lean<IPass>(),
          Unlock.findOne({ passId: s.passId, userId: new Types.ObjectId(s.holder) }).lean<{ outcome?: string }>(),
        ]);
        if (pass)
          mine.set(s.holder!, {
            url: dealLink(getDeal(pass.deal), pass.code),
            code: pass.code,
            passId: pass._id.toString(),
            outcome: unlock?.outcome ?? "none",
          });
      })
  );
  return mine;
}

function buildBeat(id: string, beat: Beat): Promise<Shared | null> {
  const gen = beat.gen;
  const promise = (async () => {
    // The waiting check-ins go in alongside the read; the next beat reads them back.
    const [, result] = await Promise.all([
      flushSeen(id).catch((error) => console.error("Draw check-ins failed:", error)),
      advanceDraw(id),
    ]);
    if (!result) return null;
    const [lines, mine] = await Promise.all([
      DrawMessage.find({ drawId: result.draw._id }).sort({ at: -1, _id: -1 }).limit(CHAT_KEPT).lean<IDrawMessage[]>(),
      minesFor(result.draw),
    ]);
    return buildShared(result.draw, result.entrants, lines.reverse(), mine);
  })();
  beat.building = { gen, promise };
  promise.then(
    (shared) => {
      if (gen >= beat.builtGen) {
        beat.ready = shared;
        beat.builtGen = gen;
        beat.at = Date.now();
      }
      if (beat.building?.promise === promise) beat.building = undefined;
    },
    () => {
      if (beat.building?.promise === promise) beat.building = undefined;
    }
  );
  return promise;
}

/**
 * The room as it stands. `fresh` is for the visitor who just did something: they wait for a
 * beat that includes it. Everyone else gets the current beat, or the last one while the next
 * is being built.
 */
function sharedRoom(id: string, { fresh = false }: { fresh?: boolean } = {}): Promise<Shared | null> {
  let beat = beats.get(id);
  if (!beat) {
    beat = { gen: 0, builtGen: -1, at: 0, askedAt: 0 };
    beats.set(id, beat);
  }
  const now = Date.now();
  beat.askedAt = now;
  // Old rooms' beats go; one entry per open room is all this ever holds.
  if (beats.size > 50) for (const [key, other] of beats) if (now - other.askedAt > 60_000) beats.delete(key);

  const upToDate = beat.ready !== undefined && beat.builtGen === beat.gen && now - beat.at < BEAT_MS;
  if (fresh) {
    if (upToDate) return Promise.resolve(beat.ready!);
    return beat.building?.gen === beat.gen ? beat.building.promise : buildBeat(id, beat);
  }
  if (upToDate) return Promise.resolve(beat.ready!);
  if (beat.building) {
    return beat.ready !== undefined && now - beat.at < STALE_OK_MS
      ? Promise.resolve(beat.ready)
      : beat.building.promise;
  }
  // This ask noticed: it builds the next beat and waits for it.
  return buildBeat(id, beat);
}

function chatLine(m: IDrawMessage): ChatLine {
  return {
    id: m._id.toString(),
    at: new Date(m.at).getTime(),
    kind: m.kind,
    tile: m.tile,
    name: m.name,
    text: m.hidden ? "" : m.text,
    host: m.host || undefined,
    event: m.event,
    hidden: m.hidden || undefined,
  };
}

function buildShared(draw: LeanDraw, list: LeanEntrant[], lines: IDrawMessage[], mine: Map<string, Mine>): Shared {
  const ctx: Ctx = { now: new Date(), people: new Map(list.map((e) => [e.userId, e])), events: [], effects: [] };
  const tile = new Map(list.map((e) => [e.userId, e._id.toString()]));
  const who = (userId?: string) => (userId ? (tile.get(userId) ?? "gone") : undefined);
  const ms = (date?: Date) => (date ? new Date(date).getTime() : undefined);
  const free = eligible(draw, ctx);
  const cutoff = ctx.now.getTime() - 3000;

  const people = [...list]
    .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime() || (a._id < b._id ? -1 : 1))
    .map((e) => ({
      id: e._id.toString(),
      name: e.name,
      picture: e.picture,
      seed: seedFor(draw._id.toString(), e.userId),
      city: e.city && repairUtf8(e.city),
      country: e.country,
      flag: flagOf(e.country),
      lat: e.lat,
      lon: e.lon,
      joinedAt: ms(e.joinedAt)!,
      present: present(ctx, e.userId),
    }));
  // Arrivals only ever add to the end, so the first n people are named by a running hash; a
  // changed name or picture changes every hash after it, and those pages get the list afresh.
  const prefix = [""];
  for (const p of people) {
    const last = prefix[prefix.length - 1];
    prefix.push(
      crypto
        .createHash("sha1")
        .update(`${last}|${p.id}:${p.name}:${p.picture ?? ""}`)
        .digest("hex")
        .slice(0, 12)
    );
  }

  const base: Shared["base"] = {
    id: draw._id.toString(),
    status: draw.status,
    test: draw.test,
    drawAt: new Date(draw.drawAt).getTime(),
    opensAt: draw.opensAt ? new Date(draw.opensAt).getTime() : undefined,
    claimSeconds: draw.claimSeconds,
    links: draw.passIds.length,
    invited: draw.invitedCount ?? 0,
    everyone: !!draw.everyone,
    chatOpen: chatOpen(draw),
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
    peopleCount: people.length,
    peopleHash: prefix[people.length],
    absent: people.filter((p) => !p.present).map((p) => p.id),
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
    chatHidden: lines.filter((m) => m.hidden).map((m) => m._id.toString()),
    chatReactions: Object.fromEntries(
      lines
        .filter((m) => !m.hidden && m.reactions?.length)
        .map((m) => {
          const counts: Record<string, number> = {};
          for (const r of m.reactions!) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
          return [m._id.toString(), counts];
        })
    ),
    eligible: free.length,
  };

  return {
    draw,
    entrants: ctx.people,
    tile,
    eligible: new Set(free),
    base,
    baseJson: JSON.stringify(base).slice(1, -1),
    people,
    peopleJson: JSON.stringify(people),
    prefix,
    chat: lines.map(chatLine),
    lineReactions: new Map(lines.filter((m) => m.reactions?.length).map((m) => [m._id.toString(), m.reactions!])),
    mine,
  };
}

/**
 * The seed of someone's identicon in one room. Known before they join, so the face in the join
 * form is the face on their tile; a hash, so nothing about the account can be read back out.
 */
export function seedFor(drawId: string, userId: string): string {
  return crypto.createHash("sha256").update(`${drawId}:${userId}`).digest("hex").slice(0, 16);
}

// Who may come in, remembered per server: an invite list doesn't change once sent, and
// someone who hasn't joined yet asks every two seconds while they decide.
const accessMemo = new Map<string, { at: number; access: Access }>();

async function accessFor(id: string, shared: Shared, user: SessionUser | null): Promise<Access> {
  if (!user) return null;
  // Someone with a tile was let in to make it.
  if (shared.entrants.has(user.id)) return "invited";
  const key = `${id}:${user.email.toLowerCase()}`;
  const hit = accessMemo.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.access;
  const access = await accessTo(id, user.email);
  if (accessMemo.size > 20_000) accessMemo.clear();
  accessMemo.set(key, { at: Date.now(), access });
  return access;
}

/**
 * "Still here", noted in memory; the next beat writes it with everyone else's. Coming back
 * after a goodbye is the exception: a winner's grace is running, so it is written at once and
 * the beat dropped, and the room sees them back before their claim arrives.
 */
async function checkIn(id: string, shared: Shared, user: SessionUser | null): Promise<void> {
  const entrant = user && shared.entrants.get(user.id);
  if (!entrant) return;
  const now = new Date();
  if (entrant.leftAt) {
    entrant.lastSeenAt = now;
    entrant.leftAt = undefined;
    await DrawEntrant.updateOne(
      { drawId: id, userId: entrant.userId, leftAt: { $lt: now } },
      { $set: { lastSeenAt: now }, $unset: { leftAt: "" } }
    );
    forget(id);
    return;
  }
  if (now.getTime() - new Date(entrant.lastSeenAt).getTime() < SEEN_WRITE_MS) return;
  let waiting = pendingSeen.get(id);
  if (!waiting) pendingSeen.set(id, (waiting = new Map()));
  waiting.set(entrant.userId, { at: now, back: !!entrant.leftAt });
  // So this beat's other asks from them don't note it again.
  entrant.lastSeenAt = now;
  entrant.leftAt = undefined;
}

type Have = { n?: number; ph?: string; chatSince?: number };

/** The people a page needs: none, the arrivals after the ones it holds, or the whole list. */
function peopleFor(shared: Shared, { n, ph }: Have): "none" | "all" | DrawPerson[] {
  const total = shared.people.length;
  if (n === undefined || ph === undefined || n > total || shared.prefix[n] !== ph) return "all";
  return n === total ? "none" : shared.people.slice(n);
}

function chatFor(shared: Shared, chatSince?: number): ChatLine[] {
  return chatSince === undefined
    ? shared.chat.filter((line) => !line.hidden)
    : shared.chat.filter((line) => line.at > chatSince - CHAT_OVERLAP_MS);
}

/**
 * The visitor's own part of the room. People are named by their tile id, never by account or
 * address, and a pass's link is only ever in the view of the person who claimed it.
 */
function viewerFor(shared: Shared, user: SessionUser | null, access: Access): DrawView["viewer"] {
  const viewer: DrawView["viewer"] = {
    invited: access === "invited",
    spectator: access === "spectator",
    eligible: !!user && shared.eligible.has(user.id),
    everWon: !!user && shared.draw.awards.some((a) => a.userId === user.id),
    reacted: {},
    blocked: !!user && !!shared.draw.chatBlocked?.includes(user.id),
  };
  if (user) {
    for (const [line, marks] of shared.lineReactions) {
      const mine = marks.filter((m) => m.userId === user.id).map((m) => m.emoji);
      if (mine.length) viewer.reacted[line] = mine;
    }
  }
  if (user && shared.tile.has(user.id)) viewer.id = shared.tile.get(user.id);
  const mine = user && shared.mine.get(user.id);
  if (mine) viewer.mine = mine;
  return viewer;
}

async function visit(id: string, user: SessionUser | null, fresh = false) {
  if (!Types.ObjectId.isValid(id)) return null;
  await dbConnect();
  const shared = await sharedRoom(id, { fresh });
  if (!shared) return null;
  const [access] = await Promise.all([accessFor(id, shared, user), checkIn(id, shared, user)]);
  return { shared, access, viewer: viewerFor(shared, user, access) };
}

/** The room's view for this visitor, as an object (the page's first render, and after an action). */
export async function roomFor(
  id: string,
  user: SessionUser | null,
  have: Have = {},
  { fresh = false }: { fresh?: boolean } = {}
): Promise<DrawView | null> {
  const seen = await visit(id, user, fresh);
  if (!seen) return null;
  const { shared, viewer } = seen;
  const people = peopleFor(shared, have);
  return {
    ...shared.base,
    now: Date.now(),
    ...(people === "all" ? { people: shared.people } : people === "none" ? {} : { peopleAdded: people }),
    chat: chatFor(shared, have.chatSince),
    viewer,
  };
}

/**
 * The same, as JSON, for a page's two-second ask: the shared part was serialised once for the
 * beat, so an answer is a few small strings joined, however many people are in the room.
 */
export async function roomJson(
  id: string,
  user: SessionUser | null,
  have: Have
): Promise<{ json: string; access: Access } | null> {
  const seen = await visit(id, user);
  if (!seen) return null;
  const { shared, viewer, access } = seen;
  const people = peopleFor(shared, have);
  const parts = [
    `"now":${Date.now()}`,
    `"viewer":${JSON.stringify(viewer)}`,
    `"chat":${JSON.stringify(chatFor(shared, have.chatSince))}`,
  ];
  if (people === "all") parts.push(`"people":${shared.peopleJson}`);
  else if (people !== "none") parts.push(`"peopleAdded":${JSON.stringify(people)}`);
  return { json: `{${parts.join(",")},${shared.baseJson}}`, access };
}

// ---- the chat -----------------------------------------------------------------------------

const CHAT_MAX = 200;
const CHAT_GAP_MS = 1200;
// After the room closes, the chat stays open this long for the goodbyes.
const CHAT_AFTER_CLOSE_MS = 15 * 60 * 1000;
const LINKISH =
  /(https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(com|net|org|io|ai|app|dev|co|me|ly|gg|xyz|link|ru|info|biz|site|online|shop|top)\b|\S+@\S+\.\S+)/i;

// Control characters, zero-width marks and direction overrides: built from code points, so the
// source holds no invisible characters itself.
const INVISIBLE = new RegExp(
  `[${(
    [
      [0x00, 0x1f],
      [0x7f, 0x9f],
      [0x200b, 0x200f],
      [0x2028, 0x202e],
      [0x2066, 0x2069],
    ] as const
  )
    .map(([from, to]) => `${String.fromCharCode(from)}-${String.fromCharCode(to)}`)
    .join("")}]`,
  "g"
);

/** What the chat will show of a message: one line, no control characters, at most CHAT_MAX. */
export function cleanChat(raw: unknown): string {
  return String(raw ?? "")
    .normalize("NFC")
    .replace(INVISIBLE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CHAT_MAX);
}

/** A message from someone in the room, or from the host. */
export async function postChat(id: string, user: SessionUser, raw: unknown): Promise<DrawResult> {
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "This draw doesn't exist.", status: 404 };
  const text = cleanChat(raw);
  if (!text) return { ok: false, error: "Type a message first.", status: 400 };
  if (LINKISH.test(text)) return { ok: false, error: "Links and addresses can't go in the chat.", status: 400 };
  if (containsBlockedCodeWord(text.replace(/\s/g, "")))
    return { ok: false, error: "Codes can't go in the chat.", status: 400 };

  await dbConnect();
  const [draw, entrant] = await Promise.all([
    Draw.findById(id)
      .select("status closedAt chatClosedAt")
      .lean<Pick<LeanDraw, "status" | "closedAt" | "chatClosedAt">>(),
    DrawEntrant.findOne({ drawId: id, userId: user.id }).lean<LeanEntrant>(),
  ]);
  if (!draw) return { ok: false, error: "This draw doesn't exist.", status: 404 };
  if (!chatOpen(draw)) return { ok: false, error: "The chat for this draw has closed.", status: 409 };

  let speaker: { tile?: string; name: string; host?: boolean };
  if (entrant) speaker = { tile: entrant._id.toString(), name: entrant.name };
  else if ((await accessTo(id, user.email)) === "spectator")
    speaker = { name: user.name?.trim().split(/\s+/)[0]?.slice(0, 20) || "Host", host: true };
  else return { ok: false, error: "Join the draw to chat.", status: 403 };
  if (await Draw.exists({ _id: id, chatBlocked: user.id }))
    return { ok: false, error: "The host has turned off chat for you in this room.", status: 403 };

  const last = await DrawMessage.findOne({ drawId: id, userId: user.id }).sort({ at: -1 }).lean<IDrawMessage>();
  if (last && Date.now() - new Date(last.at).getTime() < CHAT_GAP_MS)
    return { ok: false, error: "One moment - you're sending fast.", status: 429 };
  // The same words twice in a row is a double press, not a second message.
  if (last && last.text === text && Date.now() - new Date(last.at).getTime() < 30_000) return { ok: true };

  await DrawMessage.create({ drawId: id, at: new Date(), kind: MESSAGE_KIND.chat, userId: user.id, text, ...speaker });
  forget(id);
  return { ok: true };
}

function chatOpen(draw: Pick<LeanDraw, "closedAt" | "chatClosedAt">): boolean {
  if (draw.chatClosedAt) return false;
  return !draw.closedAt || Date.now() - new Date(draw.closedAt).getTime() <= CHAT_AFTER_CLOSE_MS;
}

/** The host closes the chat: the room stays up, read-only, with everything that was said. */
export async function closeChat(id: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(id)) return false;
  await dbConnect();
  const result = await Draw.updateOne(
    { _id: id, chatClosedAt: { $exists: false } },
    { $set: { chatClosedAt: new Date() } }
  );
  if (result.modifiedCount) {
    await postSystem(id, [{ at: Date.now(), event: "chat_closed", text: "🔒 The chat is closed. Thanks for coming!" }]);
    logEvent("draw_chat_closed", { draw: id });
  }
  forget(id);
  return result.matchedCount > 0;
}

/** Who may react to or post in a room's chat: someone with a tile, or a host. */
async function chatter(id: string, user: SessionUser): Promise<boolean> {
  if (await DrawEntrant.exists({ drawId: id, userId: user.id })) return true;
  return (await accessTo(id, user.email)) === "spectator";
}

/** An emoji on a chat line, or off it again if it was already theirs. */
export async function reactToChat(
  id: string,
  user: SessionUser,
  messageId: unknown,
  emoji: unknown
): Promise<DrawResult> {
  if (!Types.ObjectId.isValid(id) || typeof messageId !== "string" || !Types.ObjectId.isValid(messageId))
    return { ok: false, error: "Bad request.", status: 400 };
  if (typeof emoji !== "string" || !CHAT_REACTIONS.includes(emoji))
    return { ok: false, error: "Bad request.", status: 400 };
  await dbConnect();
  const draw = await Draw.findById(id).select("closedAt chatClosedAt chatBlocked").lean<LeanDraw>();
  if (!draw) return { ok: false, error: "This draw doesn't exist.", status: 404 };
  if (!chatOpen(draw)) return { ok: false, error: "The chat for this draw has closed.", status: 409 };
  if (draw.chatBlocked?.includes(user.id))
    return { ok: false, error: "The host has turned off chat for you in this room.", status: 403 };
  if (!(await chatter(id, user))) return { ok: false, error: "Join the draw to react.", status: 403 };
  const mark = { userId: user.id, emoji };
  const removed = await DrawMessage.updateOne(
    { _id: messageId, drawId: id, reactions: { $elemMatch: mark } },
    { $pull: { reactions: mark } }
  );
  if (!removed.modifiedCount)
    await DrawMessage.updateOne(
      { _id: messageId, drawId: id, hidden: { $ne: true } },
      { $addToSet: { reactions: mark } }
    );
  forget(id);
  return { ok: true };
}

/** The host blocks whoever wrote a line: everything they said leaves the room, and they can't post again. */
export async function blockFromChat(id: string, user: SessionUser, messageId: unknown): Promise<DrawResult> {
  if (!Types.ObjectId.isValid(id) || typeof messageId !== "string" || !Types.ObjectId.isValid(messageId))
    return { ok: false, error: "Bad request.", status: 400 };
  await dbConnect();
  if ((await accessTo(id, user.email)) !== "spectator")
    return { ok: false, error: "Only the host can do that.", status: 403 };
  const line = await DrawMessage.findOne({ _id: messageId, drawId: id }).lean<IDrawMessage>();
  if (!line?.userId || line.host) return { ok: false, error: "That line can't be blocked.", status: 400 };
  await Promise.all([
    Draw.updateOne({ _id: id }, { $addToSet: { chatBlocked: line.userId } }),
    DrawMessage.updateMany({ drawId: id, userId: line.userId, kind: MESSAGE_KIND.chat }, { $set: { hidden: true } }),
  ]);
  logEvent("draw_chat_blocked", { draw: id, user: line.userId });
  forget(id);
  return { ok: true };
}

/** The host takes a line down. It stays in the record, marked, and leaves every room. */
export async function hideChat(id: string, user: SessionUser, messageId: unknown): Promise<DrawResult> {
  if (!Types.ObjectId.isValid(id) || typeof messageId !== "string" || !Types.ObjectId.isValid(messageId))
    return { ok: false, error: "Bad request.", status: 400 };
  await dbConnect();
  if ((await accessTo(id, user.email)) !== "spectator")
    return { ok: false, error: "Only the host can do that.", status: 403 };
  await DrawMessage.updateOne({ _id: messageId, drawId: id }, { $set: { hidden: true } });
  logEvent("draw_chat_hidden", { draw: id, message: messageId });
  forget(id);
  return { ok: true };
}

/** A draw's whole chat, in order, for reading back afterwards. */
export async function chatRecord(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  await dbConnect();
  const lines = await DrawMessage.find({ drawId: id }).sort({ at: 1, _id: 1 }).lean<IDrawMessage[]>();
  return lines.map((m) => ({
    at: m.at,
    kind: m.kind,
    name: m.name,
    host: m.host || undefined,
    event: m.event,
    text: m.text,
    hidden: m.hidden || undefined,
  }));
}

/** The room's own lines - who arrived, what was drawn - written as the record of what happened. */
async function postSystem(drawId: Types.ObjectId | string, lines: Omit<ChatLine, "id" | "kind">[]): Promise<void> {
  if (!lines.length) return;
  await DrawMessage.insertMany(
    lines.map((line) => ({ drawId, kind: MESSAGE_KIND.system, ...line, at: new Date(line.at) })),
    { ordered: true }
  );
}

/** What the room says about each new feed item, in words, with names as they are now. */
function systemLines(draw: LeanDraw, ctx: Ctx, before: { feedSeq: number; status: string }) {
  const lines: Omit<ChatLine, "id" | "kind">[] = [];
  const total = draw.spots.length;
  const person = (userId?: string) => (userId ? ctx.people.get(userId) : undefined);
  if (before.status === DRAW_STATUS.open && draw.status !== DRAW_STATUS.open) {
    const here = presentCount(ctx);
    lines.push({
      at: ctx.now.getTime(),
      event: "started",
      text: `🚦 The draw is starting: ${here} ${here === 1 ? "person" : "people"} in the room, ${total} ${total === 1 ? "spot" : "spots"}`,
    });
  }
  for (const f of draw.feed.filter((item) => item.id > before.feedSeq)) {
    const p = person(f.userId);
    const name = p?.name ?? "Someone";
    const base = { at: new Date(f.at).getTime(), event: f.kind, tile: p?._id.toString(), name: p?.name };
    if (f.kind === "sweep")
      lines.push({
        ...base,
        text: f.redraw
          ? `🔁 Re-drawing spot ${f.spot} among the ${f.candidates} still here`
          : `🎲 Drawing spot ${f.spot} of ${total} from ${f.candidates} ${f.candidates === 1 ? "person" : "people"}`,
      });
    else if (f.kind === "won") lines.push({ ...base, text: `🎉 ${name} won spot ${f.spot}!` });
    else if (f.kind === "claimed") lines.push({ ...base, text: `✅ ${name} claimed spot ${f.spot}` });
    else if (f.kind === "released")
      lines.push({
        ...base,
        text:
          f.reason === "passed_on"
            ? `↩️ ${name} passed spot ${f.spot} on`
            : f.reason === "left"
              ? `🚪 ${name} left, so spot ${f.spot} goes back`
              : `⏱️ ${name} didn't claim spot ${f.spot} in time`,
      });
    else if (f.kind === "winner_left")
      lines.push({
        ...base,
        text: `🚪 ${name} left the room. Spot ${f.spot} goes back in ${GRACE_SECONDS} s unless they return`,
      });
    else if (f.kind === "winner_back")
      lines.push({ ...base, text: `👋 ${name} is back. Spot ${f.spot} is still theirs` });
    else if (f.kind === "unfilled") lines.push({ ...base, text: `Nobody was left to draw spot ${f.spot} for` });
    else if (f.kind === "closed")
      lines.push({
        ...base,
        text: `🏁 Room closed: ${f.claimed ?? 0} of ${total} ${total === 1 ? "spot" : "spots"} claimed`,
      });
  }
  return lines;
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
  next?: {
    id: string;
    status: string;
    drawAt: number;
    spots: number;
    links: number;
    invited: number;
    everyone: boolean;
    youreInvited: boolean;
    /** Announced ahead: when the room opens. */
    opensAt?: number;
  };
  /** Held listings not yet in a draw, and the spots they make. */
  waiting: { links: number; spots: number };
  last?: {
    id: string;
    drawAt: number;
    closedAt: number;
    claimed: number;
    spots: number;
    joined: number;
    /** First names of the people who claimed, as the room showed them. */
    winners: string[];
  };
  /** How many the next draw would invite, as things stand. */
  invites: number;
  nextScheduled: number;
}

async function lastDrawFor(last: LeanDraw): Promise<NonNullable<DrawSummary["last"]>> {
  const claimed = last.spots.filter((s) => s.status === SPOT_STATUS.claimed);
  const holders = claimed.map((s) => s.holder).filter((h): h is string => Boolean(h));
  const [joined, names] = await Promise.all([
    DrawEntrant.countDocuments({ drawId: last._id }),
    DrawEntrant.find({ drawId: last._id, userId: { $in: holders } }).select("userId name").lean<{ userId: string; name: string }[]>(),
  ]);
  const byUser = new Map(names.map((e) => [e.userId, e.name]));
  return {
    id: last._id.toString(),
    drawAt: new Date(last.drawAt).getTime(),
    closedAt: new Date(last.closedAt!).getTime(),
    claimed: claimed.length,
    spots: last.spots.length,
    joined,
    winners: holders.map((h) => byUser.get(h)).filter((n): n is string => Boolean(n)),
  };
}

/**
 * Everyone who has got one of this brand's passes here, ever: one each however many they
 * opened, and not counting a link they told us was dead. The home page's one big number.
 */
export async function peopleServed(deal: DealSlug): Promise<number> {
  await dbConnect();
  const brand = deal === "claude" ? { $or: [{ deal }, { deal: { $exists: false } }, { deal: null }] } : { deal };
  const people = await Unlock.distinct("userId", { ...brand, outcome: { $ne: "dead" } });
  return people.length;
}

export async function drawSummary(deal: DealSlug, email?: string): Promise<DrawSummary> {
  await dbConnect();
  const [open, last, held] = await Promise.all([
    Draw.findOne({ deal, test: false, status: { $ne: DRAW_STATUS.closed } })
      .sort({ drawAt: 1 })
      .select("drawAt opensAt status spots passIds invitedCount everyone")
      .lean<LeanDraw>(),
    Draw.findOne({ deal, test: false, status: DRAW_STATUS.closed })
      .sort({ closedAt: -1 })
      .select("drawAt closedAt spots")
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
          invited: next.invitedCount ?? 0,
          everyone: !!next.everyone,
          youreInvited: (await accessTo(next._id, email)) === "invited",
          opensAt: next.opensAt ? new Date(next.opensAt).getTime() : undefined,
        }
      : undefined,
    waiting: { links: waitingPasses.length, spots: waitingSpots },
    last: last ? await lastDrawFor(last) : undefined,
    invites: invitesFor(waitingSpots || getDeal(deal).unlocksPerListing),
    nextScheduled: nextScheduledDraw().getTime(),
  };
}

/**
 * Somebody who joined the line after a show was announced: they are in the line it invited,
 * so they are invited too, and get the same email. Only a show still ahead of its draw, and
 * only someone still waiting (not stopped, not already a winner). Never throws: joining the
 * line must not fail because a mail did.
 */
export async function inviteLatecomer(address: string, deal: DealSlug): Promise<void> {
  try {
    await dbConnect();
    const email = address.toLowerCase();
    const waiting = await Membership.exists({ email, deal, stoppedAt: { $exists: false }, leftQueueAt: { $exists: false } });
    if (!waiting) return;
    const shows = await Draw.find({
      deal,
      test: false,
      everyone: true,
      status: DRAW_STATUS.open,
      drawAt: { $gt: new Date() },
      invited: { $ne: email },
      spectators: { $ne: email },
    })
      .select("_id")
      .lean<{ _id: Types.ObjectId }[]>();
    for (const show of shows) {
      const added = await Draw.updateOne(
        { _id: show._id, invited: { $ne: email } },
        { $addToSet: { invited: email }, $inc: { invitedCount: 1 } }
      );
      if (!added.modifiedCount) continue;
      const id = show._id.toString();
      const { delivered } = await sendInvites(id, { only: [email] });
      if (delivered) await Draw.updateOne({ _id: show._id }, { $addToSet: { sent: email } });
      logEvent("draw_latecomer", { deal, draw: id, delivered });
    }
  } catch (error) {
    console.error("Latecomer invite failed:", error);
  }
}

export type OpenResult =
  | {
      draw: LeanDraw;
      created: boolean;
      /** Invites accepted by the mailer in this call. */
      delivered: number;
      /** Invites still to send: a big send stops before the request runs out, and picks up. */
      remaining: number;
      /** Each spectator's way in: the same signed-in link an invite carries. */
      spectatorLinks: Record<string, string>;
    }
  | { draw: null; reason: string };

export interface OpenInput {
  deal: DealSlug;
  drawAt: Date;
  claimSeconds?: number;
  test?: { emails: string[]; codes: string[] };
  /** Only these held listings, each checked by hand first; otherwise every held one. */
  passIds?: string[];
  /** A show: invite everyone waiting on the board, not the front, and count it against nobody. */
  everyone?: boolean;
  /** Addresses that may watch the room but never join it - the operator, the recorder. */
  spectators?: string[];
  /** False opens the room without mailing anyone, so it can be looked at first (sendInvites). */
  send?: boolean;
  /** Announced ahead: the room stays shut, with a countdown, until this moment. */
  opensAt?: Date;
}

/** Makes sure an address can be signed in by link: a confirmed watch row with an enter token. */
async function linkFor(email: string, deal: DealSlug, drawId: string): Promise<string> {
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
  const watcher = await Watcher.findOne({ email });
  await ensureEnterTokens([watcher!]);
  return enterUrl(watcher!.enterToken!, deal, drawId);
}

/**
 * Opens a draw: held listings become spots, people are invited, and (unless `send` is false)
 * the invites go out. Idempotent per slot - a second call finds the first draw.
 *
 * A test draw is given its codes and its addresses instead. It invites only those, leaves
 * the line and everyone's place in it alone, and can be opened any time.
 */
export async function openDraw(input: OpenInput): Promise<OpenResult> {
  await dbConnect();
  const { deal, drawAt, test } = input;
  const spectators = [...new Set((input.spectators ?? []).map((e) => e.trim().toLowerCase()))];

  if (!test) {
    const existing = await Draw.findOne({ deal, drawAt, test: false }).select(UNREAD_LISTS).lean<LeanDraw>();
    if (existing) return { ...(await reopened(existing)), created: false };
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
    if (input.passIds) {
      // Named listings: every one must be there to give, or nothing opens.
      const wanted = new Set(input.passIds);
      passes = passes.filter((p) => wanted.has(p._id.toString()));
      const found = new Set(passes.map((p) => p._id.toString()));
      const missing = input.passIds.filter((id) => !found.has(id));
      if (missing.length) return { draw: null, reason: `not_held:${missing.join(",")}` };
    }
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

  let invitees: string[];
  if (test) {
    invitees = test.emails.map((email) => email.trim().toLowerCase());
  } else if (input.everyone) {
    // Everyone waiting. Nobody is demoted first: a show isn't a turn anyone can sleep through.
    invitees = (await frontOfLine(deal, Number.MAX_SAFE_INTEGER)).map((m) => m.email);
  } else {
    await demoteNoShows(deal);
    invitees = (await frontOfLine(deal, invitesFor(spots.length))).map((m) => m.email);
  }
  // A spectator can't also be a player, even one who is in the line.
  invitees = [...new Set(invitees)].filter((email) => !spectators.includes(email));

  let draw;
  try {
    draw = await Draw.create({
      deal,
      drawAt,
      opensAt: input.opensAt,
      claimSeconds: input.claimSeconds ?? CLAIM_SECONDS,
      test: Boolean(test),
      everyone: Boolean(input.everyone && !test),
      passIds: passes.map((p) => p._id),
      spots,
      invited: invitees,
      invitedCount: invitees.length,
      spectators,
    });
  } catch (error) {
    // Two runs raced for the slot. The other one opened it and sends the invites.
    const existing = await Draw.findOne({ deal, drawAt, test: false }).select(UNREAD_LISTS).lean<LeanDraw>();
    if (existing) return { ...(await reopened(existing)), created: false };
    throw error;
  }
  const id = draw._id.toString();

  // Test addresses and spectators need a way in, like anyone invited. Created if missing;
  // never given a place in any line.
  if (test) for (const email of invitees) await linkFor(email, deal, id);
  const spectatorLinks: Record<string, string> = {};
  for (const email of spectators) spectatorLinks[email] = await linkFor(email, deal, id);

  logEvent("draw_opened", {
    draw: id,
    deal,
    test: Boolean(test),
    everyone: Boolean(input.everyone && !test),
    drawAt: drawAt.toISOString(),
    links: passes.length,
    spots: spots.length,
    invited: invitees.length,
    spectators: spectators.length,
    claimSeconds: draw.claimSeconds,
  });

  const lean = (await Draw.findById(id).select(UNREAD_LISTS).lean<LeanDraw>())!;
  if (input.send === false)
    return { draw: lean, created: true, delivered: 0, remaining: invitees.length, spectatorLinks };
  const sent = await sendInvites(id);
  return { draw: lean, created: true, delivered: sent.delivered, remaining: sent.remaining, spectatorLinks };
}

/** A draw that was already open for the slot, with what the operator needs to carry on. */
async function reopened(existing: LeanDraw) {
  const lists = await Draw.findById(existing._id).select("spectators").lean<{ spectators?: string[] }>();
  const spectatorLinks: Record<string, string> = {};
  for (const email of lists?.spectators ?? [])
    spectatorLinks[email] = await linkFor(email, existing.deal, existing._id.toString());
  return { draw: existing, delivered: 0, remaining: await unsentCount(existing._id), spectatorLinks };
}

async function unsentCount(id: Types.ObjectId | string): Promise<number> {
  const [row] = await Draw.aggregate<{ n: number }>([
    { $match: { _id: new Types.ObjectId(id.toString()) } },
    { $project: { n: { $size: { $setDifference: ["$invited", { $ifNull: ["$sent", []] }] } } } },
  ]);
  return row?.n ?? 0;
}

// How long one call may spend mailing. A show invites the whole line; past this the call
// returns what is left and the next call carries on, so no request runs out mid-send.
const SEND_BUDGET_MS = 200_000;
const SEND_CHUNK = 100;

/**
 * Mails a draw's invites to everyone invited who hasn't had one. Safe to call again: each
 * address is marked sent as soon as the mailer accepts it, and is never sent twice.
 *
 * `only` sends to just those addresses - invited or spectating - and leaves them unmarked,
 * so the operator can see the real email before anyone else does.
 */
export async function sendInvites(
  id: string,
  { only, budgetMs = SEND_BUDGET_MS }: { only?: string[]; budgetMs?: number } = {}
): Promise<{ delivered: number; remaining: number; preview: boolean }> {
  await dbConnect();
  const draw = await Draw.findById(id).lean<LeanDraw>();
  if (!draw) return { delivered: 0, remaining: 0, preview: false };
  const brand = getDeal(draw.deal);
  const invite = {
    id,
    drawAt: new Date(draw.drawAt),
    spots: draw.spots.length,
    links: draw.passIds.length,
    invited: draw.invitedCount ?? draw.invited.length,
    claimSeconds: draw.claimSeconds,
    everyone: !!draw.everyone,
    opensAt: draw.opensAt ? new Date(draw.opensAt) : undefined,
  };

  const preview = Array.isArray(only);
  let queue: string[];
  if (preview) {
    const allowed = new Set([...draw.invited, ...(draw.spectators ?? [])]);
    queue = only!.map((e) => e.trim().toLowerCase()).filter((e) => allowed.has(e));
  } else {
    const done = new Set(draw.sent ?? []);
    queue = draw.invited.filter((email) => !done.has(email));
  }

  const started = Date.now();
  let delivered = 0;
  while (queue.length && Date.now() - started < budgetMs) {
    const chunk = queue.splice(0, SEND_CHUNK);
    const watchers = await Watcher.find({ email: { $in: chunk }, stoppedAt: { $exists: false } });
    await ensureEnterTokens(watchers);
    const accepted = await sendDrawInvites(
      watchers.map((w) => ({
        email: w.email,
        enterUrl: enterUrl(w.enterToken!, draw.deal, id),
        stopUrl: stopUrl(w.stopToken),
        timezone: w.timezone,
      })),
      brand,
      invite
    );
    delivered += accepted.length;
    if (preview) continue;
    // Someone who stopped the emails since the line was read is done too: nothing to send.
    const stopped = chunk.filter((email) => !watchers.some((w) => w.email === email));
    await Draw.updateOne({ _id: draw._id }, { $addToSet: { sent: { $each: [...accepted, ...stopped] } } });
    if (!draw.test && accepted.length) {
      // An invite to the front is an offer, as an alert was: three ignored and the number goes
      // to the back. A show's isn't - everyone was asked, and staying away costs nothing.
      await Membership.updateMany(
        { deal: draw.deal, email: { $in: accepted } },
        {
          $set: { lastNotifiedAt: new Date() },
          $inc: draw.everyone ? { notifyCount: 1 } : { notifyCount: 1, offersSinceUnlock: 1 },
        }
      );
    }
  }
  const remaining = preview ? 0 : await unsentCount(draw._id);
  logEvent("draw_invites_sent", { draw: id, delivered, remaining, preview });
  return { delivered, remaining, preview };
}

/** Where a draw stands, for the operator: who was asked, who came, what happened. */
export async function drawStatus(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  await dbConnect();
  const { draw, entrants } = await load(id);
  if (!draw) return null;
  const ctx: Ctx = { now: new Date(), people: new Map(entrants.map((e) => [e.userId, e])), events: [], effects: [] };
  return {
    draw: id,
    status: draw.status,
    everyone: !!draw.everyone,
    drawAt: draw.drawAt,
    invited: draw.invitedCount ?? 0,
    unsent: await unsentCount(draw._id),
    joined: entrants.length,
    present: presentCount(ctx),
    spots: draw.spots.map((s) => ({ n: s.n, status: s.status, redraws: s.history.length })),
    check: draw.check,
  };
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
  const [{ draw, entrants }, lists] = await Promise.all([
    load(id),
    Draw.findById(id).select("invited spectators").lean<{ invited: string[]; spectators?: string[] }>(),
  ]);
  if (!draw || !lists) return;
  const invited = new Set(lists.invited);
  const spectators = new Set(lists.spectators ?? []);
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
      if (!invited.has(entrant.email)) problems.push(`spot ${a.spot} went to ${a.userId}, who wasn't invited`);
      if (spectators.has(entrant.email)) problems.push(`spot ${a.spot} went to ${a.userId}, a spectator`);
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
    invited: draw.invitedCount ?? 0,
    everyone: !!draw.everyone,
  });
}
