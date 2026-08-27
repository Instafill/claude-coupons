import { NextRequest, NextResponse } from "next/server";

import { findOrCreateUser, safeReturnTo, setSessionCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(baseUrl);

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${baseUrl}/api/auth/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(`${baseUrl}/signin?error=google`);
    }

    const tokens = await tokenRes.json();
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userRes.ok) {
      console.error("Userinfo fetch failed:", await userRes.text());
      return NextResponse.redirect(`${baseUrl}/signin?error=google`);
    }

    const profile = await userRes.json();
    if (!profile.email) {
      return NextResponse.redirect(`${baseUrl}/signin?error=noemail`);
    }

    const user = await findOrCreateUser(profile.email, {
      name: profile.name,
      picture: profile.picture,
      googleId: profile.sub,
    });

    const returnTo = safeReturnTo(request.nextUrl.searchParams.get("state"));
    const response = NextResponse.redirect(`${baseUrl}${returnTo}`);
    setSessionCookie(response, user);
    return response;
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(`${baseUrl}/signin?error=google`);
  }
}
