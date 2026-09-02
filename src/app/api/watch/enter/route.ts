import { NextRequest, NextResponse } from "next/server";

import { findOrCreateUser, setSessionCookie } from "@/lib/auth";
import { baseUrl, enter } from "@/lib/watchers";

// GET: the button in an alert email. Someone on the list, on any device, presses it and
// lands on the board already able to unlock - no sign-in screen between the email and the
// pass, because the minutes that would take are the minutes the pass lasts.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const result = token ? await enter(token) : null;
  if (!result) return NextResponse.redirect(`${baseUrl()}/watch?state=invalid`);

  const user = await findOrCreateUser(result.email);
  const response = NextResponse.redirect(`${baseUrl()}/`);
  setSessionCookie(response, user);
  return response;
}
