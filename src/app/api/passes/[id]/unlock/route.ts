import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getUser } from "@/lib/auth";
import { dealLink } from "@/lib/deals";
import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import {
  UNLOCKS_PER_USER_PER_DAY,
  countRecentUnlocks,
  dealOf,
  hashIp,
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

  // Which board this listing belongs to decides which line is checked, which allowance is
  // spent, and which queue the unlock takes them out of.
  const deal = dealOf(pass);

  const { ok, standing } = await mayUnlock(user.email, pass);
  if (!standing) {
    logEvent("unlock_rejected", { deal: deal.slug, reason: "no_number", user: user.id });
    return NextResponse.json({ error: "Take a number to unlock.", reason: "join" }, { status: 403 });
  }
  if (!ok) {
    logEvent("unlock_rejected", { deal: deal.slug, reason: "wave_closed", user: user.id, wave: standing.wave });
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
  // Counted per board: a run on Waymo codes must not spend someone's Claude allowance.
  if (!already && (await countRecentUnlocks(user.id, deal.slug)) >= UNLOCKS_PER_USER_PER_DAY) {
    logEvent("unlock_rejected", { deal: deal.slug, reason: "daily_cap", user: user.id });
    return NextResponse.json(
      {
        error: `You've unlocked ${UNLOCKS_PER_USER_PER_DAY} ${deal.nounPlural} in the last 24 hours. Try one of those first, or come back tomorrow.`,
      },
      { status: 429 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip");
  await recordUnlock(id, user.id, deal.slug, hashIp(ip));
  // Their turn on this board is spent: out of that queue, and everyone behind them on it
  // moves up one. The lines they hold on other boards are untouched.
  await leaveQueue(user.email, deal.slug);
  logEvent("pass_unlocked", { deal: deal.slug, pass: id, user: user.id, wave: standing.wave });

  return NextResponse.json({ url: dealLink(deal, pass.code), code: pass.code });
}
