import { NextRequest, NextResponse } from "next/server";

import { logEvent } from "@/lib/events";
import { MAX_OTHER_LENGTH, cleanInterests } from "@/lib/interests";
import { readForm } from "@/lib/request";
import { recordAnswers } from "@/lib/watchers";

/**
 * Records which other tools someone would want a drop for, asked on the screen that follows
 * a subscription while they are on their way to their inbox.
 *
 * Two separate things arrive here and are kept separate on purpose. The tool names are
 * research - they decide which pages are worth building. The opt-in is permission to write,
 * and it is the only thing in this codebase that could ever put non-pass mail in an inbox,
 * because the confirmation email promised pass alerts and never a newsletter. Answering the
 * question does not grant it; ticking the box does, and nothing else.
 *
 * Authorised by the token the subscription just returned rather than by a session, because
 * at this point there is no session - they have not opened the email yet.
 */
export async function POST(request: NextRequest) {
  const form = await readForm(request);
  const answerToken = String(form.get("answerToken") || "");
  if (!answerToken) return NextResponse.json({ error: "Nothing to answer." }, { status: 400 });

  const saved = await recordAnswers({
    answerToken,
    interests: cleanInterests(form.getAll("tools").map(String)),
    interestsOther: String(form.get("other") || "").trim().slice(0, MAX_OTHER_LENGTH),
    interestsOptIn: Boolean(form.get("optIn")),
  });
  if (!saved) return NextResponse.json({ error: "That answer has expired." }, { status: 404 });

  // The names stay out of the log - the row holds them, and a log line is the wrong place
  // for a list of what one identifiable person is shopping for.
  logEvent("interests_saved", {
    picked: form.getAll("tools").length,
    other: Boolean(form.get("other")),
    optIn: Boolean(form.get("optIn")),
  });
  return NextResponse.json({ ok: true });
}
