import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export interface SessionUser {
  id: string; // our own User._id, not the Google subject
  email: string;
  name?: string;
  picture?: string;
}

const COOKIE_NAME = "cc_session";
const SECRET = () => process.env.AUTH_SECRET!;

export function createSessionCookie(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionCookie(cookie: string): SessionUser | null {
  const [payload, signature] = cookie.split(".");
  if (!payload || !signature) return null;

  const expected = crypto
    .createHmac("sha256", SECRET())
    .update(payload)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, user: SessionUser): void {
  response.cookies.set(COOKIE_NAME, createSessionCookie(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function getUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  return verifySessionCookie(cookie.value);
}

// Google hands back a 96px avatar (".../photo.jpg=s96-c"). Ask for 256 instead, so a
// contributors wall can render one at a readable size without a blurry upscale. The suffix
// is a Google image-server directive, not part of the file name, so rewriting it is safe.
function upscaleAvatar(url: string): string {
  return url.replace(/=s\d+(-c)?$/, "=s256$1");
}

// Both doors - a proven mailbox or a Google account - end here: one email address becomes
// one user document and one session. Name and avatar are refreshed on every Google sign-in,
// so a contributors or claimers list can be built from these rows later without asking
// anyone for anything again.
export async function findOrCreateUser(
  email: string,
  profile?: { name?: string; picture?: string; googleId?: string }
): Promise<SessionUser> {
  await dbConnect();
  const normalized = email.trim().toLowerCase();
  // Read before the upsert so signups can be told apart from sign-ins.
  const existed = await User.exists({ email: normalized });
  const set: Record<string, string> = {};
  if (profile?.name) set.name = profile.name;
  if (profile?.picture) set.picture = upscaleAvatar(profile.picture);
  if (profile?.googleId) set.googleId = profile.googleId;

  const user = await User.findOneAndUpdate(
    { email: normalized },
    { $setOnInsert: { email: normalized }, ...(Object.keys(set).length ? { $set: set } : {}) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  logEvent(existed ? "signed_in" : "signed_up", {
    method: profile?.googleId ? "google" : "email",
    user: user._id!.toString(),
  });

  return {
    id: user._id!.toString(),
    email: user.email,
    name: user.name,
    picture: user.picture,
  };
}

export function safeReturnTo(value: string | null | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
