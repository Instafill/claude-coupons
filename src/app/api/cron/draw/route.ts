import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { DEFAULT_DEAL } from "@/lib/deals";
import {
  TEST_CODE_PREFIX,
  chatRecord,
  closeChat,
  drawStatus,
  nextDrawAt,
  openDraw,
  sendInvites,
  settleAbandonedDraws,
} from "@/lib/draw";
import { EMAIL_SHAPE, baseUrl } from "@/lib/watchers";

// The live draw's switch and its one scheduled job.
//
// GET is Vercel Cron (vercel.json), two hours before the daily draw: if any Claude listings
// are held, it opens today's draw and sends the invites; if none are, it does nothing. It
// also settles any room everyone left. Nothing happens unless LIVE_DRAW is "on" - that env
// var is the whole switch, and with it off the site keeps holding new listings.
//
// POST is the operator's hand on it, with the cron secret:
//   {"line": true, ...}          a real draw now (or "at" an ISO time): the held listings, real
//                                invites. "passIds" names the listings (checked by hand first);
//                                "everyone": true invites the whole line, as a show, and costs
//                                nobody their place; "spectators" may watch, never join;
//                                "send": false opens it without mailing anyone yet.
//   {"send": "<draw id>"}        mails the invites not yet sent (a big send stops after a few
//                                minutes and says how many are left; call it again).
//   {"send": "<id>", "only": [...]}  mails just those addresses (invited or spectating) and
//                                marks nobody: the real email, seen first by the operator.
//   {"status": "<draw id>"}      where a draw stands: invited, sent, joined, here, spots.
//   {"chat": "<draw id>"}        the draw's whole chat, in order, as it scrolled past.
//   {"closeChat": "<draw id>"}   closes the chat now; the room stays up, read-only.
//   anything else                a test: given addresses, test codes, nobody in the line touched.

// A show mails the whole line from one request; SEND_BUDGET_MS in lib/draw.ts stays inside this.
export const maxDuration = 300;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settled = await settleAbandonedDraws();
  if (process.env.LIVE_DRAW !== "on") return NextResponse.json({ live: false, settled });

  const result = await openDraw({ deal: DEFAULT_DEAL, drawAt: nextDrawAt() });
  if (!result.draw) return NextResponse.json({ live: true, settled, opened: false, reason: result.reason });
  // The cron may have stopped part-way through a big send last time: carry on with it.
  const more = !result.created && result.remaining ? await sendInvites(result.draw._id.toString()) : null;
  return NextResponse.json({
    live: true,
    settled,
    opened: result.created,
    draw: result.draw._id.toString(),
    drawAt: result.draw.drawAt,
    spots: result.draw.spots.length,
    invited: result.draw.invitedCount,
    delivered: result.delivered + (more?.delivered ?? 0),
    remaining: more ? more.remaining : result.remaining,
  });
}

const addresses = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((e: unknown) => String(e).trim().toLowerCase()).filter((e: string) => EMAIL_SHAPE.test(e))
    : [];

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  if (typeof body.status === "string") {
    const status = await drawStatus(body.status);
    return status ? NextResponse.json(status) : NextResponse.json({ error: "No such draw." }, { status: 404 });
  }

  if (typeof body.closeChat === "string") {
    return (await closeChat(body.closeChat))
      ? NextResponse.json({ closed: true })
      : NextResponse.json({ error: "No such draw." }, { status: 404 });
  }

  if (typeof body.chat === "string") {
    const lines = await chatRecord(body.chat);
    return lines ? NextResponse.json({ lines }) : NextResponse.json({ error: "No such draw." }, { status: 404 });
  }

  if (typeof body.send === "string") {
    if (!Types.ObjectId.isValid(body.send)) return NextResponse.json({ error: "No such draw." }, { status: 404 });
    const only = body.only === undefined ? undefined : addresses(body.only);
    if (only && !only.length) return NextResponse.json({ error: "Give addresses in only." }, { status: 400 });
    const result = await sendInvites(body.send, { only });
    return NextResponse.json(result);
  }

  const claimSeconds = Math.min(Math.max(Number(body.claimSeconds) || 60, 10), 300);
  let drawAt: Date;
  if (body.at !== undefined) {
    drawAt = new Date(String(body.at));
    const ahead = drawAt.getTime() - Date.now();
    if (Number.isNaN(ahead) || ahead < 60_000 || ahead > 7 * 24 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: "at must be an ISO time between a minute and a week from now." },
        { status: 400 }
      );
    }
  } else {
    const minutes = Math.min(Math.max(Number(body.inMinutes) || 3, 0.25), 180);
    drawAt = new Date(Date.now() + minutes * 60 * 1000);
  }
  const spectators = addresses(body.spectators);

  if (body.line === true) {
    const passIds = Array.isArray(body.passIds) ? body.passIds.map(String) : undefined;
    if (passIds && (!passIds.length || !passIds.every((id: string) => Types.ObjectId.isValid(id)))) {
      return NextResponse.json({ error: "passIds must be listing ids." }, { status: 400 });
    }
    const result = await openDraw({
      deal: DEFAULT_DEAL,
      drawAt,
      claimSeconds,
      passIds,
      everyone: body.everyone === true,
      spectators,
      send: body.send !== false,
    });
    if (!result.draw) return NextResponse.json({ error: result.reason }, { status: 409 });
    const id = result.draw._id.toString();
    return NextResponse.json({
      draw: id,
      room: `${baseUrl()}/draw/${id}`,
      created: result.created,
      everyone: result.draw.everyone,
      drawAt: result.draw.drawAt,
      spots: result.draw.spots.length,
      invited: result.draw.invitedCount,
      delivered: result.delivered,
      remaining: result.remaining,
      spectatorLinks: result.spectatorLinks,
    });
  }

  const emails = addresses(body.emails);
  if (!emails.length || emails.length > 50) {
    return NextResponse.json({ error: "Give 1-50 addresses in emails." }, { status: 400 });
  }
  const links = Math.min(Math.max(Number(body.links) || 1, 1), 5);
  const stamp = Date.now().toString(36).toUpperCase();
  const codes = Array.from({ length: links }, (_, i) => `${TEST_CODE_PREFIX}${stamp}-${i + 1}`);

  const result = await openDraw({
    deal: DEFAULT_DEAL,
    drawAt,
    claimSeconds,
    test: { emails, codes },
    spectators,
  });
  if (!result.draw) return NextResponse.json({ error: result.reason }, { status: 409 });
  const id = result.draw._id.toString();
  return NextResponse.json({
    draw: id,
    room: `${baseUrl()}/draw/${id}`,
    drawAt: result.draw.drawAt,
    spots: result.draw.spots.length,
    invited: emails.length,
    spectatorLinks: result.spectatorLinks,
  });
}
