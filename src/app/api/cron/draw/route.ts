import { NextRequest, NextResponse } from "next/server";

import { DEFAULT_DEAL } from "@/lib/deals";
import { TEST_CODE_PREFIX, nextDrawAt, openDraw, settleAbandonedDraws } from "@/lib/draw";
import { EMAIL_SHAPE, baseUrl } from "@/lib/watchers";

// The live draw's switch and its one scheduled job.
//
// GET is Vercel Cron (vercel.json), two hours before the daily draw: if any Claude listings
// are held, it opens today's draw and sends the invites; if none are, it does nothing. It
// also settles any room everyone left. Nothing happens unless LIVE_DRAW is "on" - that env
// var is the whole switch, and with it off the site keeps holding new listings.
//
// POST opens a draw now rather than at the daily time. With "line": true it is a real one -
// the held listings, the front of the line, real invites - for when listings are waiting and
// tomorrow is too long. Otherwise it is a test: given addresses, test codes, and nobody in
// the line touched. Both need the cron secret.

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
  return NextResponse.json({
    live: true,
    settled,
    opened: result.created,
    draw: result.draw._id.toString(),
    drawAt: result.draw.drawAt,
    spots: result.draw.spots.length,
    invited: result.draw.invited.length,
    delivered: result.delivered,
  });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const minutes = Math.min(Math.max(Number(body.inMinutes) || 3, 0.25), 180);
  const claimSeconds = Math.min(Math.max(Number(body.claimSeconds) || 60, 10), 300);
  const drawAt = new Date(Date.now() + minutes * 60 * 1000);

  if (body.line === true) {
    const result = await openDraw({ deal: DEFAULT_DEAL, drawAt, claimSeconds });
    if (!result.draw) return NextResponse.json({ error: result.reason }, { status: 409 });
    const id = result.draw._id.toString();
    return NextResponse.json({
      draw: id,
      room: `${baseUrl()}/draw/${id}`,
      drawAt: result.draw.drawAt,
      spots: result.draw.spots.length,
      invited: result.draw.invited.length,
      delivered: result.delivered,
    });
  }

  const emails: string[] = Array.isArray(body.emails)
    ? body.emails.map((e: unknown) => String(e).trim().toLowerCase()).filter((e: string) => EMAIL_SHAPE.test(e))
    : [];
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
  });
  if (!result.draw) return NextResponse.json({ error: result.reason }, { status: 409 });
  const id = result.draw._id.toString();
  return NextResponse.json({
    draw: id,
    room: `${baseUrl()}/draw/${id}`,
    drawAt: result.draw.drawAt,
    spots: result.draw.spots.length,
    invited: emails.length,
  });
}
