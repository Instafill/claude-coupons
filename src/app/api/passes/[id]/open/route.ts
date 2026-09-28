import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import { dealOf, hashIp, recordUnlock } from "@/lib/passes";
import Pass, { PASS_STATUS } from "@/models/Pass";

// An open board (deal.openBoard) shows every code to everyone, so there is nothing to
// unlock. This only counts that somebody opened or copied one: the count orders the board
// (least opened first, so every listing gets its turn at the top) and tells the lister how
// many people it reached. Signed in, the open is recorded as the visitor's own unlock, which
// is what lets them answer "did it work?" - the one thing that takes a dead code down.
// The browser counts each listing once (localStorage); a signed-in visitor is counted once
// by the unlock row itself.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await dbConnect();
  const pass = await Pass.findById(id);
  if (!pass || pass.status !== PASS_STATUS.live) {
    return NextResponse.json({ error: "This listing is no longer available." }, { status: 404 });
  }
  const deal = dealOf(pass);
  if (!deal.openBoard) {
    return NextResponse.json({ error: "This board has a queue." }, { status: 400 });
  }

  const user = await getUser();
  if (user) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip");
    await recordUnlock(id, user.id, deal.slug, hashIp(ip));
  } else {
    await Pass.updateOne({ _id: pass._id }, { $inc: { unlockCount: 1 } });
  }
  logEvent("pass_opened", { deal: deal.slug, pass: id, signedIn: Boolean(user) });

  return NextResponse.json({ ok: true, ask: Boolean(user) });
}
