import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { MAX_OTHER_LENGTH, cleanInterests } from "@/lib/interests";
import { dbConnect } from "@/lib/mongodb";
import Watcher from "@/models/Watcher";

/**
 * Records which other tools someone on the list would want a drop for.
 *
 * Two separate things arrive here and they are kept separate on purpose. The tool names are
 * research - they decide which pages are worth building. The opt-in is permission to write,
 * and it is the only thing in this codebase that could ever put non-pass mail in an inbox,
 * because the confirmation email promised pass alerts and never a newsletter. Answering the
 * question does not grant it; ticking the box does, and nothing else.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const form = await request.formData();
  const interests = cleanInterests(form.getAll("tools").map(String));
  const other = String(form.get("other") || "").trim().slice(0, MAX_OTHER_LENGTH);
  const optIn = Boolean(form.get("optIn"));

  await dbConnect();
  const result = await Watcher.updateOne(
    { email: user.email.toLowerCase() },
    {
      $set: {
        interests: interests.length ? interests : undefined,
        interestsOther: other || undefined,
        interestsOptIn: optIn,
        interestsAt: new Date(),
      },
    }
  );
  if (!result.matchedCount) {
    return NextResponse.json({ error: "You are not on the list." }, { status: 404 });
  }

  // The names themselves stay out of the log - the row holds them, and a log line is the
  // wrong place for a list of what one identifiable person is shopping for.
  logEvent("interests_saved", { picked: interests.length, other: Boolean(other), optIn });
  return NextResponse.json({ ok: true });
}
