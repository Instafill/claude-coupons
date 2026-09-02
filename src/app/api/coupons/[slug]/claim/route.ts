import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/lib/auth";
import { claimCode } from "@/lib/coupons";
import { getCurrentDrop, getProductBySlug } from "@/lib/products";
import { ipHashFromHeaderList } from "@/lib/request";
import { resolveSubscriber } from "@/lib/subscribers";

// POST: one code for one confirmed subscriber. Identity comes from the token in their
// email link or from the session - never from a typed address.
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const contentType = request.headers.get("content-type") || "";
  let token: string | null = null;
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    token = typeof body.t === "string" ? body.t : null;
  } else {
    const form = await request.formData().catch(() => null);
    token = form ? String(form.get("t") || "") || null : null;
  }

  const user = await getUser();
  const [drop, subscriber] = await Promise.all([
    getCurrentDrop(product),
    resolveSubscriber({ product, token, sessionEmail: user?.email }),
  ]);
  if (!subscriber) return NextResponse.json({ ok: false, reason: "not_subscribed" });
  if (!drop) return NextResponse.json({ ok: false, reason: "not_live" });

  const result = await claimCode({ drop, subscriber, ipHash: ipHashFromHeaderList(request.headers) });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
