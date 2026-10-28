import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getUser } from "@/lib/auth";
import { claimSpot, editEntrant, joinDraw, leaveDraw, passOnSpot, placeForRequest, react, roomFor } from "@/lib/draw";
import { hashIp } from "@/lib/passes";

// One draw's room. GET is the ask every open page makes every couple of seconds: it moves the
// draw along, notes the asker is still here, and answers with the room as they see it. POST
// is everything a visitor does in it. The rules all live in lib/draw.ts.

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  const view = await roomFor(id, user);
  if (!view) return NextResponse.json({ error: "This draw doesn't exist." }, { status: 404, headers: NO_STORE });
  // Only the people invited see who is in the room.
  if (!view.viewer.invited) {
    return NextResponse.json(
      { error: "This draw is for the people invited to it." },
      { status: 403, headers: NO_STORE }
    );
  }
  return NextResponse.json(view, { headers: NO_STORE });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "This draw doesn't exist." }, { status: 404 });
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in with the link in your invite first." }, { status: 401 });

  // Read as text: the goodbye a closing page sends (navigator.sendBeacon) arrives as text/plain.
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  switch (body.action) {
    case "leave":
      await leaveDraw(id, user.id);
      return new NextResponse(null, { status: 204 });
    case "react":
      await react(id, user.id, body.emoji);
      return new NextResponse(null, { status: 204 });
    case "join": {
      const zone = typeof body.zone === "string" ? body.zone.slice(0, 64) : undefined;
      const place = await placeForRequest(user.email, request.headers, zone);
      const result = await joinDraw(id, user, { name: body.name, usePhoto: body.usePhoto }, place);
      return answer(id, user, result);
    }
    case "edit":
      return answer(id, user, await editEntrant(id, user, { name: body.name, usePhoto: body.usePhoto }));
    case "passon":
      return answer(id, user, await passOnSpot(id, user));
    case "claim": {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? request.headers.get("x-real-ip");
      const result = await claimSpot(id, user, hashIp(ip));
      if (!result.ok) return answer(id, user, result);
      const view = await roomFor(id, user);
      return NextResponse.json({ ...result, view }, { headers: NO_STORE });
    }
    default:
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}

/** The outcome, with the room as it now stands, so the page redraws without waiting to ask. */
async function answer(
  id: string,
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>,
  result: { ok: true } | { ok: false; error: string; status: number }
) {
  const view = await roomFor(id, user);
  if (!result.ok) return NextResponse.json({ error: result.error, view }, { status: result.status, headers: NO_STORE });
  return NextResponse.json({ ok: true, view }, { headers: NO_STORE });
}
