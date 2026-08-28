"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Types } from "mongoose";

import { getUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import { containsBlockedCodeWord, hashIp, parseOfficialReferralUrl } from "@/lib/passes";
import { notifyNewPass } from "@/lib/sendgrid";
import Pass, { PASS_STATUS } from "@/models/Pass";
import RejectedSubmission from "@/models/RejectedSubmission";

export interface SubmitState {
  error?: string;
  success?: string;
}

const ANONYMOUS_SUBMISSIONS_PER_DAY = 5;

// Keeps the raw paste when the form turns someone away, so the next validator bug is
// diagnosable from our own records instead of a user's screenshot. Stored in Mongo, not
// the log line - the log gets only a masked shape ("xxxxx://xxxxxx.xx/xxxxxxxx/x_xxxx...")
// that shows structure without carrying a possibly-working code. Never throws: losing the
// diagnostic must not change what the submitter sees.
async function recordRejection(
  input: string,
  reason: string,
  userId: string | undefined,
  ipHash: string
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
      ...(userId ? { userId: new Types.ObjectId(userId) } : {}),
      ipHash,
    });
  } catch (error) {
    console.error("Failed to record rejected submission:", error);
  }
}

async function getSubmitterIpHash(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return hashIp(forwarded || requestHeaders.get("x-real-ip") || "unknown");
}

// Contributing is deliberately account-free. Signed-in contributors retain dashboard
// ownership; anonymous contributors are associated only with a one-way IP hash for abuse
// throttling and same-device relisting.
export async function submitPass(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const user = await getUser();
  const raw = String(formData.get("link") || "");
  const ipHash = await getSubmitterIpHash();

  // Hidden from people, commonly filled by automated form spam.
  if (String(formData.get("website") || "")) {
    logEvent("submit_rejected", { reason: "honeypot" });
    return { error: "That submission could not be accepted." };
  }

  const code = parseOfficialReferralUrl(raw);
  if (!code) {
    await recordRejection(raw, "bad_link", user?.id, ipHash);
    return {
      error:
        "Paste the complete official link, e.g. https://claude.ai/referral/c_AbCd1234.",
    };
  }
  if (containsBlockedCodeWord(code)) {
    await recordRejection(raw, "blocked_language", user?.id, ipHash);
    return { error: "That referral URL contains language we don't allow on the board." };
  }

  await dbConnect();
  const submitterUserId = user ? new Types.ObjectId(user.id) : undefined;
  const existing = await Pass.findOne({ code });

  if (existing) {
    const ownedByUser = Boolean(
      submitterUserId && existing.submitterUserId?.equals(submitterUserId)
    );
    const ownedAnonymously = !existing.submitterUserId && existing.submitterIpHash === ipHash;
    if (!ownedByUser && !ownedAnonymously) {
      await recordRejection(raw, "duplicate", user?.id, ipHash);
      return { error: "This pass link is already listed by someone else." };
    }
    if (existing.status === PASS_STATUS.live) {
      await recordRejection(raw, "already_live", user?.id, ipHash);
      return { error: "This pass link is already on the board." };
    }
    // Back on the board, with the expiry clock and the dead-report count reset - the
    // claims it already served still stand against the sender's allotment.
    existing.status = PASS_STATUS.live;
    existing.lastRefreshedAt = new Date();
    existing.deadCount = 0;
    await existing.save();
    logEvent("pass_relisted", {
      pass: existing._id.toString(),
      user: user?.id || "anonymous",
    });
    await notify(code, user, "back on the board");
  } else {
    if (!user) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = await Pass.countDocuments({ submitterIpHash: ipHash, createdAt: { $gte: cutoff } });
      if (recent >= ANONYMOUS_SUBMISSIONS_PER_DAY) {
        await recordRejection(raw, "rate_limited", undefined, ipHash);
        return { error: "Too many passes were submitted from this connection today. Try again tomorrow." };
      }
    }

    const created = await Pass.create({
      code,
      ...(submitterUserId ? { submitterUserId } : {}),
      submitterIpHash: ipHash,
    });
    logEvent("pass_submitted", {
      pass: created._id.toString(),
      user: user?.id || "anonymous",
    });
    await notify(code, user, "listed");
  }

  revalidatePath("/");
  revalidatePath("/manage");
  if (user) redirect("/manage");
  return { success: "Your pass is live. Thank you for giving someone a chance to use Claude." };
}

// Awaited rather than fired and forgotten: a serverless function can be frozen the moment
// it responds, which would drop a pending send. notifyNewPass swallows its own failures,
// so this can never cost the submitter their listing.
async function notify(
  code: string,
  user: { email: string; name?: string } | null,
  what: string
): Promise<void> {
  const livePasses = await Pass.countDocuments({ status: PASS_STATUS.live });
  await notifyNewPass({
    code,
    submitterEmail: user?.email,
    submitterName: user?.name ? `${user.name} - ${what}` : user ? undefined : `Anonymous - ${what}`,
    livePasses,
  });
}
