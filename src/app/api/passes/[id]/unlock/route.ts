import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import {
  UNLOCKS_PER_USER_PER_DAY,
  countRecentUnlocks,
  hashIp,
  passUrl,
  recordUnlock,
} from "@/lib/passes";
import { leaveQueue, mayUnlock } from "@/lib/queue";
import Pass, { PASS_STATUS } from "@/models/Pass";
import Unlock from "@/models/Unlock";

// The queue is the gate. A session says who you are; your place in line says whether the
// pass has been offered to you yet. Both have to hold, and a person whose turn has not
// come is told when it will rather than being let through.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Take a number to unlock.", reason: "join" }, { status: 401 });
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await dbConnect();
  const pass = await Pass.findById(id);
  if (!pass || pass.status !== PASS_STATUS.live) {
    logEvent("unlock_rejected", { reason: "gone", user: user.id });
    return NextResponse.json({ error: "This pass is no longer available." }, { status: 404 });
  }

  const { ok, standing } = await mayUnlock(user.email, pass);
  if (!standing) {
    logEvent("unlock_rejected", { reason: "no_number", user: user.id });
    return NextResponse.json({ error: "Take a number to unlock.", reason: "join" }, { status: 403 });
  }
  if (!ok) {
    logEvent("unlock_rejected", { reason: "wave_closed", user: user.id, wave: standing.wave });
    return NextResponse.json(
      {
        error: `Wave ${standing.wave} hasn't opened yet. A new wave opens every five minutes.`,
        reason: "wave",
      },
      { status: 403 }
    );
  }

  const already = await Unlock.findOne({
    passId: new Types.ObjectId(id),
    userId: new Types.ObjectId(user.id),
  });
  if (!already && (await countRecentUnlocks(user.id)) >= UNLOCKS_PER_USER_PER_DAY) {
    logEvent("unlock_rejected", { reason: "daily_cap", user: user.id });
    return NextResponse.json(
      {
        error: `You've unlocked ${UNLOCKS_PER_USER_PER_DAY} passes in the last 24 hours. Try one of those first, or come back tomorrow.`,
      },
      { status: 429 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip");
  await recordUnlock(id, user.id, hashIp(ip));
  // Their turn is spent: out of the queue, and everyone behind them moves up one.
  await leaveQueue(user.email);
  logEvent("pass_unlocked", { pass: id, user: user.id, wave: standing.wave });

  return NextResponse.json({ url: passUrl(pass.code), code: pass.code });
}
