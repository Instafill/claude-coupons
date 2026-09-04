import { NextResponse } from "next/server";

import { getUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import Watcher from "@/models/Watcher";

/**
 * The price probe. Someone in the queue pressed a button offering to skip the line for
 * $0.99, and this records that they pressed it - nothing more. No charge is made, no card
 * is asked for, and the queue does not move, which is what the button says the moment it
 * is pressed.
 *
 * It exists because the question "would anyone pay to jump the line" is worth a real
 * answer before any billing is built, and because selling position here would contradict
 * what this site publishes: passes have no cash value and are not transferable, so nobody
 * may charge for one, us included.
 *
 * Signed in only. The button is shown to people who already hold a number, so an
 * anonymous press would be a press by someone with no line to skip.
 */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  await dbConnect();
  const result = await Watcher.updateOne(
    { email: user.email.toLowerCase() },
    { $set: { skipProbeAt: new Date() }, $inc: { skipProbeCount: 1 } }
  );
  if (!result.matchedCount) {
    return NextResponse.json({ error: "You are not in the queue." }, { status: 404 });
  }

  logEvent("skip_probe_pressed", { user: user.id });
  return NextResponse.json({ ok: true });
}
