import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/lib/auth";
import { readGeo } from "@/lib/geo";
import { placeWatcher } from "@/lib/watchers";

/**
 * Records where the signed-in caller is. Exists because the wave poll - the other request
 * that does this - only runs on a board that has passes on it, and the board this list was
 * built for is usually empty. Someone waiting in the queue would never have been placed.
 *
 * Fired once per page load by the card, not on a timer. The update itself matches nothing
 * and writes nothing when the location has not changed, so a returning visitor costs one
 * indexed query.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: true });

  await placeWatcher(user.email, readGeo(request.headers));
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
