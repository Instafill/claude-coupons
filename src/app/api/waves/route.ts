import { NextResponse } from "next/server";

import { advanceWaves } from "@/lib/queue";

// POST: open any wave that has come due. Called by the board in an open tab every 30
// seconds, which is what turns the clock without a scheduler: the people wave 1 emailed
// are on the page within a minute, and their requests carry the waves behind them.
export async function POST() {
  const opened = await advanceWaves();
  return NextResponse.json({ opened }, { headers: { "Cache-Control": "no-store" } });
}
