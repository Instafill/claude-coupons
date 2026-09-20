import { NextRequest, NextResponse } from "next/server";

import { findOrCreateUser, setSessionCookie } from "@/lib/auth";
import { getDeal } from "@/lib/deals";
import { readGeo } from "@/lib/geo";
import { baseUrl, enter, placeWatcher } from "@/lib/watchers";

// GET: the button in an alert email. Someone on the list, on any device, presses it and
// lands on the board already able to unlock - no sign-in screen between the email and the
// pass, because the minutes that would take are the minutes the pass lasts.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const result = token ? await enter(token) : null;
  if (!result) return NextResponse.redirect(`${baseUrl()}/watch?state=invalid`);

  // Reaches people who joined long before any of this was captured, and on whichever
  // device actually opened the alert.
  await placeWatcher(result.email, readGeo(request.headers));
  const user = await findOrCreateUser(result.email);
  // The alert said which board had filled, and the link carries it, so the button lands on
  // that board rather than making someone watching two of them go looking.
  const board = getDeal(request.nextUrl.searchParams.get("deal")).path;
  const response = NextResponse.redirect(`${baseUrl()}${board}`);
  setSessionCookie(response, user);
  return response;
}
