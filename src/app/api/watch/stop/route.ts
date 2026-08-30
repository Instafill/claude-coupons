import { NextRequest, NextResponse } from "next/server";

import { baseUrl, stop } from "@/lib/watchers";

// GET: someone clicked "stop these emails" and is watching their browser.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token) await stop(token);
  // Confirmed either way. A bad token means the address is not on the list, which is what
  // the page says - and there is nothing here worth telling an attacker apart.
  return NextResponse.redirect(`${baseUrl()}/watch?state=stopped`);
}

// POST: the mail client's own unsubscribe button (RFC 8058 one-click). No page to show, and
// no confirmation step - the whole point is that it takes exactly one press.
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token) await stop(token);
  return new NextResponse(null, { status: 200 });
}
