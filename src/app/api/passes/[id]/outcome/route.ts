import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getUser } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { recordOutcome } from "@/lib/passes";

// The visitor who just tried the link is the only validity check that exists, so this is
// where "did it work?" is recorded - once per unlock.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  await dbConnect();
  const recorded = await recordOutcome(id, user.id, String(body.result || ""));

  return recorded
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Nothing to record." }, { status: 400 });
}
