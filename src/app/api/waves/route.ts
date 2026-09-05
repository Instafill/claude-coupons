import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/lib/auth";
import { readGeo } from "@/lib/geo";
import { advanceWaves } from "@/lib/queue";
import { placeWatcher } from "@/lib/watchers";

// POST: open any wave that has come due. Called by the board in an open tab every 30
// seconds, which is what turns the clock without a scheduler: the people wave 1 emailed
// are on the page within a minute, and their requests carry the waves behind them.
//
// It is also the widest net for placing the people who joined before their location was
// ever recorded - anyone signed in with the board open passes through here. The write only
// happens when the location actually changed, so the repeat polls cost nothing.
export async function POST(request: NextRequest) {
  const [opened, user] = await Promise.all([advanceWaves(), getUser()]);
  if (user) await placeWatcher(user.email, readGeo(request.headers));
  return NextResponse.json({ opened }, { headers: { "Cache-Control": "no-store" } });
}
