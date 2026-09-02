import { NextRequest, NextResponse } from "next/server";

import { baseUrl, confirm } from "@/lib/watchers";

// GET: the link from the confirmation email. A good link lands on the home page, where the
// list card they just joined shows the banner and the live numbers; a bad one lands on the
// plain explanation, since there is nothing on the board to show for it.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const ok = token ? await confirm(token) : false;
  return NextResponse.redirect(ok ? `${baseUrl()}/?watch=confirmed` : `${baseUrl()}/watch?state=invalid`);
}
