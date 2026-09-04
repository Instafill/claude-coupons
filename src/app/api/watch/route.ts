import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { MAX_OTHER_LENGTH, cleanInterests } from "@/lib/interests";
import { hashIp } from "@/lib/passes";
import { readForm } from "@/lib/request";
import { TURNSTILE_FIELD, verifyTurnstile } from "@/lib/turnstile";
import { EMAIL_SHAPE, subscribe } from "@/lib/watchers";
import { WATCH_INTENT, WatchIntent } from "@/models/Watcher";

// POST: ask to be told when the board has passes again.
export async function POST(request: NextRequest) {
  const form = await readForm(request);
  // Same honeypot as the sign-in form: humans never see it, bots fill it. Answer normally so
  // the bot cannot tell it was caught.
  if (form.get("website")) {
    logEvent("honeypot_tripped");
    return NextResponse.json({ ok: true });
  }

  const email = String(form.get("email") || "").trim().toLowerCase();
  if (!EMAIL_SHAPE.test(email)) {
    return NextResponse.json(
      { error: "That doesn't look like an email address." },
      { status: 400 }
    );
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";

  // Every subscribe pays the captcha, signed in or not: this endpoint puts mail in an
  // inbox, and the confirmation step only protects addresses, not our sending domain.
  if (!(await verifyTurnstile(String(form.get(TURNSTILE_FIELD) || ""), ip))) {
    logEvent("captcha_failed", { where: "watch" });
    return NextResponse.json(
      { error: "The captcha didn't verify. Reload the page and try again." },
      { status: 400 }
    );
  }

  const user = await getUser();
  const ipHash = hashIp(ip);

  // Unrecognised or absent answers are dropped rather than rejected: the question is a
  // measurement, and a missing measurement must never cost someone their place in line.
  const answer = String(form.get("intent") || "");
  const intent = (Object.values(WATCH_INTENT) as string[]).includes(answer)
    ? (answer as WatchIntent)
    : undefined;

  // Research, and separately the one box that is permission to write. Both ride in with the
  // subscription: there is one submit, so there is one request.
  const { watching } = await subscribe({
    email,
    ipHash,
    intent,
    interests: cleanInterests(form.getAll("tools").map(String)),
    interestsOther: String(form.get("other") || "").trim().slice(0, MAX_OTHER_LENGTH),
    interestsOptIn: Boolean(form.get("optIn")),
    userId: user?.id,
    // Their own session address arrived through Google or a magic link, so it is already
    // proven. Any other address they type still has to be confirmed.
    preVerified: user?.email === email,
  });

  return NextResponse.json({ ok: true, watching });
}
