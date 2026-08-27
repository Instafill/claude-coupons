import { NextRequest, NextResponse } from "next/server";

import { safeReturnTo } from "@/lib/auth";

// Kicks off the Google handshake. Same shape as the sprinkles implementation: return_to
// rides through the OAuth `state` parameter so the callback can send the user back.
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("return_to"));

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${baseUrl}/api/auth/callback`,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  });
  if (returnTo !== "/") params.set("state", returnTo);

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
