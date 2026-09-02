import { NextRequest, NextResponse } from "next/server";

import { confirm } from "@/lib/subscribers";
import { baseUrl } from "@/lib/watchers";

// GET: the link from the confirmation email. Lands on the product page, which reads the
// state and the token from the URL, shows the place in line and keeps the token so a
// return visit still knows who is looking.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = request.nextUrl.searchParams.get("token");
  const result = token ? await confirm(token) : null;
  if (!result) return NextResponse.redirect(`${baseUrl()}/coupons/${slug}?state=invalid`);
  return NextResponse.redirect(`${baseUrl()}/coupons/${result.slug}?state=confirmed&t=${result.accessToken}`);
}
