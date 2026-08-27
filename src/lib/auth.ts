import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

// Both doors - a proven mailbox or a Google account - end here: one email address becomes
// one user document and one session.
export async function findOrCreateUser(
  email: string,
  profile?: { name?: string; picture?: string; googleId?: string }
): Promise<SessionUser> {
  await dbConnect();
  const normalized = email.trim().toLowerCase();
  const set: Record<string, string> = {};
  if (profile?.name) set.name = profile.name;
  if (profile?.picture) set.picture = profile.picture;
  if (profile?.googleId) set.googleId = profile.googleId;

  const user = await User.findOneAndUpdate(
    { email: normalized },
    { $setOnInsert: { email: normalized }, ...(Object.keys(set).length ? { $set: set } : {}) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

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
