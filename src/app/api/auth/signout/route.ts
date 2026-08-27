import { NextRequest, NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
  const response = NextResponse.redirect(baseUrl, { status: 303 });
  clearSessionCookie(response);
  return response;
}
