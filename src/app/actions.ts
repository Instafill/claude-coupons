"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Types } from "mongoose";

import { getUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import { parseReferralCode } from "@/lib/passes";
import { notifyNewPass } from "@/lib/sendgrid";
import Pass, { PASS_STATUS } from "@/models/Pass";
import RejectedSubmission from "@/models/RejectedSubmission";

export interface SubmitState {
  error?: string;
}

// Keeps the raw paste when the form turns someone away, so the next validator bug is
// diagnosable from our own records instead of a user's screenshot. Stored in Mongo, not
// the log line - the log gets only a masked shape ("xxxxx://xxxxxx.xx/xxxxxxxx/x_xxxx...")
// that shows structure without carrying a possibly-working code. Never throws: losing the
// diagnostic must not change what the submitter sees.
async function recordRejection(
  input: string,
  reason: string,
  userId: string
): Promise<void> {
  const trimmed = input.trim().slice(0, 500);
  logEvent("submit_rejected", {
    reason,
    shape: trimmed.replace(/[A-Za-z]/g, "x").replace(/[0-9]/g, "9").slice(0, 120),
    len: trimmed.length,
  });
  try {
    await dbConnect();
    await RejectedSubmission.create({
      input: trimmed,
      reason,
      userId: new Types.ObjectId(userId),
    });
  } catch (error) {
    console.error("Failed to record rejected submission:", error);
  }
}

// Listing a pass requires an account, same as unlocking one. Submitting a link you already
// own puts it back on the board - that is the only way back for a listing the lifecycle
// rules retired, since the dashboard is read-only.
export async function submitPass(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const user = await getUser();
  if (!user) redirect("/signin?return_to=%2Fsubmit");

  const raw = String(formData.get("link") || "");
  const code = parseReferralCode(raw);
  if (!code) {
    await recordRejection(raw, "bad_link", user.id);
    return {
      error:
        "That doesn't look like an invite link. Paste the whole thing, e.g. https://claude.ai/referral/c_AbCd1234 - or just the code after the last slash.",
    };
  }

  await dbConnect();
  const submitterUserId = new Types.ObjectId(user.id);
  const existing = await Pass.findOne({ code });

  if (existing) {
    if (!existing.submitterUserId.equals(submitterUserId)) {
      await recordRejection(raw, "duplicate", user.id);
      return { error: "This pass link is already listed by someone else." };
    }
    if (existing.status === PASS_STATUS.live) {
      await recordRejection(raw, "already_live", user.id);
      return { error: "This pass link is already on the board." };
    }
    // Back on the board, with the expiry clock and the dead-report count reset - the
    // claims it already served still stand against the sender's allotment.
    existing.status = PASS_STATUS.live;
    existing.lastRefreshedAt = new Date();
    existing.deadCount = 0;
    await existing.save();
    logEvent("pass_relisted", { pass: existing._id.toString(), user: user.id });
    await notify(code, user, "back on the board");
  } else {
    const created = await Pass.create({ code, submitterUserId });
    logEvent("pass_submitted", { pass: created._id.toString(), user: user.id });
    await notify(code, user, "listed");
  }

  revalidatePath("/");
  revalidatePath("/manage");
  redirect("/manage");
}

// Awaited rather than fired and forgotten: a serverless function can be frozen the moment
// it responds, which would drop a pending send. notifyNewPass swallows its own failures,
// so this can never cost the submitter their listing.
async function notify(
  code: string,
  user: { email: string; name?: string },
  what: string
): Promise<void> {
  const livePasses = await Pass.countDocuments({ status: PASS_STATUS.live });
  await notifyNewPass({
    code,
    submitterEmail: user.email,
    submitterName: user.name ? `${user.name} - ${what}` : undefined,
    livePasses,
  });
}
