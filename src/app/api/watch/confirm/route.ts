import { NextRequest, NextResponse } from "next/server";

import { baseUrl, confirm } from "@/lib/watchers";

// GET: the link from the confirmation email.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const ok = token ? await confirm(token) : false;
  return NextResponse.redirect(`${baseUrl()}/watch?state=${ok ? "confirmed" : "invalid"}`);
}
