import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/lib/auth";
import { existingClaim } from "@/lib/coupons";
import { getCurrentDrop, getProductBySlug, pageState, progress, toPublicDrop } from "@/lib/products";
import { resolveSubscriber } from "@/lib/subscribers";

// GET: everything the page shows that depends on who is looking or on the last few
// seconds - the queue numbers, the drop, and the viewer's own place and code. The page
// HTML is the same for everyone; this is where it becomes personal.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const user = await getUser();
  const token = request.nextUrl.searchParams.get("t");
  const [drop, subscriber] = await Promise.all([
    getCurrentDrop(product),
    resolveSubscriber({ product, token, sessionEmail: user?.email }),
  ]);

  const state = pageState(product, drop);
  let me: { status: "pending" | "confirmed" | "stopped"; position: number | null; claim: unknown } | null = null;
  if (subscriber) {
    const status = subscriber.stoppedAt ? "stopped" : subscriber.confirmedAt ? "confirmed" : "pending";
    const claim = drop && status === "confirmed" ? await existingClaim(drop._id, subscriber._id) : null;
    me = { status, position: subscriber.position ?? null, claim };
  }

  return NextResponse.json(
    {
      progress: progress(product),
      drop: toPublicDrop(drop),
      state,
      hasCodes: product.poolCapacity > 0,
      owned: Boolean(product.ownerUserId),
      me,
      signedIn: Boolean(user),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
