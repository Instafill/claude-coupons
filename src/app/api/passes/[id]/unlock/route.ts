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
import { isWatching } from "@/lib/watchers";
import Pass, { PASS_STATUS } from "@/models/Pass";
import Unlock from "@/models/Unlock";

// Behind the list, not just a login: the session says who, the list says they played by
// the rules. A confirmed address is a session already (the confirm link starts one), so a
// person on the list never sees a sign-in screen; a person who is not on it gets told the
// one thing that will let them in.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Join the list to unlock.", reason: "join" }, { status: 401 });
  if (!(await isWatching(user.email))) {
    logEvent("unlock_rejected", { reason: "not_on_list", user: user.id });
    return NextResponse.json({ error: "Join the list to unlock.", reason: "join" }, { status: 403 });
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await dbConnect();
  const pass = await Pass.findById(id);
  if (!pass || pass.status !== PASS_STATUS.live) {
    logEvent("unlock_rejected", { reason: "gone", user: user.id });
    return NextResponse.json({ error: "This pass is no longer available." }, { status: 404 });
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
  logEvent("pass_unlocked", { pass: id, user: user.id });

  return NextResponse.json({ url: passUrl(pass.code), code: pass.code });
}
