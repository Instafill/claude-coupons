import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
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
  const result = String(body.result || "");
  const recorded = await recordOutcome(id, user.id, result);
  // The whole lifecycle turns on these answers, so record both the ones that counted and
  // the ones that arrived too late to.
  logEvent(recorded ? "pass_outcome" : "pass_outcome_ignored", {
    result,
    pass: id,
  });

  return recorded
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Nothing to record." }, { status: 400 });
}
