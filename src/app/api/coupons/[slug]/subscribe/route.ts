import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { getProductBySlug } from "@/lib/products";
import { ipHashFromHeaderList } from "@/lib/request";
import { subscribe } from "@/lib/subscribers";

// POST: ask for a place in line for one product's codes.
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await request.formData();
  // Same honeypot as every other form here: humans never see it, bots fill it. Answer
  // normally so the bot cannot tell it was caught.
  if (form.get("website")) {
    logEvent("honeypot_tripped", { where: "coupon_subscribe" });
    return NextResponse.json({ ok: true, status: "sent" });
  }

  const product = await getProductBySlug(slug);
  if (!product) return NextResponse.json({ error: "That page no longer exists." }, { status: 404 });

  const email = String(form.get("email") || "").trim().toLowerCase();
  const user = await getUser();
  const result = await subscribe({
    product,
    email,
    ipHash: ipHashFromHeaderList(request.headers),
    userId: user?.id,
    // Their own session address arrived through Google or a magic link, so it is already
    // proven. Any other address they type still has to be confirmed.
    preVerified: user?.email === email,
  });

  if (result.status === "rejected") return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, ...result });
}
