import { NextRequest, NextResponse } from "next/server";

import { stop } from "@/lib/subscribers";
import { baseUrl } from "@/lib/watchers";

// GET: someone pressed "stop these emails" and is watching their browser.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = request.nextUrl.searchParams.get("token");
  const landed = token ? await stop(token) : null;
  // Confirmed either way. A bad token means the address is not on the list, which is what
  // the page says - and there is nothing here worth telling an attacker apart.
  return NextResponse.redirect(`${baseUrl()}/coupons/${landed ?? slug}?state=stopped`);
}

// POST: the mail client's own unsubscribe button (RFC 8058 one-click).
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token) await stop(token);
  return new NextResponse(null, { status: 200 });
}
