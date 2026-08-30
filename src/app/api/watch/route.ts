import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { hashIp } from "@/lib/passes";
import { EMAIL_SHAPE, subscribe } from "@/lib/watchers";

// POST: ask to be told when the board has passes again.
export async function POST(request: NextRequest) {
  const form = await request.formData();
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

  const user = await getUser();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipHash = hashIp(forwarded || request.headers.get("x-real-ip") || "unknown");

  const { watching } = await subscribe({
    email,
    ipHash,
    userId: user?.id,
    // Their own session address arrived through Google or a magic link, so it is already
    // proven. Any other address they type still has to be confirmed.
    preVerified: user?.email === email,
  });

  return NextResponse.json({ ok: true, watching });
}
