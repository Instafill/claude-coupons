import { NextRequest, NextResponse } from "next/server";

import { findOrCreateUser, setSessionCookie } from "@/lib/auth";
import { readGeo } from "@/lib/geo";
import { baseUrl, confirm, placeWatcher } from "@/lib/watchers";

// GET: the link from the confirmation email. A good click proves the mailbox, which is
// what a magic link proves, so it starts the session too: the list is the only door to
// the board, and joining it is what lets you unlock. It lands on the home page, where the
// card shows the banner and the live numbers. A bad link lands on the plain explanation.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const result = token ? await confirm(token) : null;
  if (!result) return NextResponse.redirect(`${baseUrl()}/watch?state=invalid`);

  // A confirmation click is the first request from this person that both knows who they
  // are and carries the edge's geo, so it is where most of the list gets placed.
  await placeWatcher(result.email, readGeo(request.headers));
  const user = await findOrCreateUser(result.email);
  const response = NextResponse.redirect(`${baseUrl()}/?watch=confirmed`);
  setSessionCookie(response, user);
  return response;
}
