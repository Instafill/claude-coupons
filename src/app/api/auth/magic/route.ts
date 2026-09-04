import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { findOrCreateUser, safeReturnTo, setSessionCookie } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import { readForm } from "@/lib/request";
import { sendMagicLink } from "@/lib/sendgrid";
import LoginToken from "@/models/LoginToken";

const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// POST: issue a one-time sign-in link.
export async function POST(request: NextRequest) {
  const form = await readForm(request);
  // "website" is a honeypot - humans never see it, bots fill it. Answer normally so the
  // bot cannot tell it was caught.
  if (form.get("website")) {
    logEvent("honeypot_tripped");
    return NextResponse.json({ ok: true });
  }

  const email = String(form.get("email") || "").trim().toLowerCase();
  if (!EMAIL_SHAPE.test(email)) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }

  await dbConnect();
  const token = crypto.randomBytes(24).toString("hex");
  await LoginToken.create({
    token,
    email,
    returnTo: safeReturnTo(String(form.get("return_to") || "/")),
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
  await sendMagicLink(email, `${baseUrl}/api/auth/magic?token=${token}`);
  logEvent("magic_link_sent");

  return NextResponse.json({ ok: true });
}

// GET: consume the link and start the session.
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(`${baseUrl}/signin?error=link`);

  await dbConnect();
  // Single use: only an unused token flips, so a replayed link finds nothing.
  const loginToken = await LoginToken.findOneAndUpdate(
    { token, usedAt: { $exists: false } },
    { $set: { usedAt: new Date() } }
  );
  if (!loginToken) {
    logEvent("magic_link_rejected");
    return NextResponse.redirect(`${baseUrl}/signin?error=link`);
  }

  const user = await findOrCreateUser(loginToken.email);
  const response = NextResponse.redirect(`${baseUrl}${safeReturnTo(loginToken.returnTo)}`);
  setSessionCookie(response, user);
  return response;
}
