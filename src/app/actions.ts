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

export interface SubmitState {
  error?: string;
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

  const code = parseReferralCode(String(formData.get("link") || ""));
  if (!code) {
    logEvent("submit_rejected", { reason: "bad_link" });
    return {
      error:
        "Paste your personal invite link, e.g. https://claude.ai/referral/AbCd123456 - nothing else is accepted.",
    };
  }

  await dbConnect();
  const submitterUserId = new Types.ObjectId(user.id);
  const existing = await Pass.findOne({ code });

  if (existing) {
    if (!existing.submitterUserId.equals(submitterUserId)) {
      logEvent("submit_rejected", { reason: "duplicate" });
      return { error: "This pass link is already listed by someone else." };
    }
    if (existing.status === PASS_STATUS.live) {
      logEvent("submit_rejected", { reason: "already_live" });
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
