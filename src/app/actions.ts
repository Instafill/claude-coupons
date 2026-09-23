"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Types } from "mongoose";

import { getUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import {
  DEFAULT_DEAL,
  Deal,
  getDeal,
  isDealSlug,
  parseDealCode,
  pasteHint,
} from "@/lib/deals";
import { containsBlockedCodeWord, countLivePasses, dealFilter, hashIp } from "@/lib/passes";
import { advanceWaves, demoteNoShows } from "@/lib/queue";
import { notifyNewPass } from "@/lib/sendgrid";
import { TURNSTILE_FIELD, verifyTurnstile } from "@/lib/turnstile";
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
  ipHash: string,
  deal: string
): Promise<void> {
  const trimmed = input.trim().slice(0, 500);
  logEvent("submit_rejected", {
    deal,
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

async function getSubmitterIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || requestHeaders.get("x-real-ip") || "unknown";
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
  // Which board this is for. An unknown value is read as Claude rather than rejected: the
  // field was added after the form existed, and a submission is too valuable to lose to it.
  const slug = String(formData.get("deal") || "");
  const deal = getDeal(isDealSlug(slug) ? slug : DEFAULT_DEAL);
  // A board we know and have closed is refused outright. The fallback above is for slugs we do
  // not recognise; letting a closed one through it would file the listing under Claude.
  if (deal.waitlistOnly) {
    logEvent("submit_rejected", { reason: "waitlist_only", deal: deal.slug });
    return {
      error: `${deal.name} doesn't issue codes anyone can pass on, so that board only keeps a list. There is nothing to submit to it yet.`,
    };
  }
  const ip = await getSubmitterIp();
  const ipHash = hashIp(ip);

  // Hidden from people, commonly filled by automated form spam.
  if (String(formData.get("website") || "")) {
    logEvent("submit_rejected", { reason: "honeypot" });
    return { error: "That submission could not be accepted." };
  }

  // Everyone pays the captcha, signed in or not - a stolen session scripting submissions
  // is rarer than a bot, but not rare enough to leave the door open.
  if (!(await verifyTurnstile(String(formData.get(TURNSTILE_FIELD) || ""), ip))) {
    logEvent("captcha_failed", { where: "submit" });
    return { error: "The captcha didn't verify. Reload the page and try again." };
  }

  const code = parseDealCode(deal, raw);
  if (!code) {
    await recordRejection(raw, "bad_link", user?.id, ipHash, deal.slug);
    return {
      error: `${pasteHint(deal)} It should look like ${
        deal.linkTemplate
          ? deal.linkTemplate.replace("{code}", deal.codeExample)
          : deal.codeExample
      }.`,
    };
  }
  if (containsBlockedCodeWord(code)) {
    await recordRejection(raw, "blocked_language", user?.id, ipHash, deal.slug);
    return { error: "That referral code contains language we don't allow on the board." };
  }

  await dbConnect();
  const submitterUserId = user ? new Types.ObjectId(user.id) : undefined;
  // Scoped to the board: two brands could mint the same short code, and one brand's
  // listing must never be refused because another brand already used those characters.
  const existing = await Pass.findOne({ code, ...dealFilter(deal.slug) });

  if (existing) {
    const ownedByUser = Boolean(
      submitterUserId && existing.submitterUserId?.equals(submitterUserId)
    );
    const ownedAnonymously = !existing.submitterUserId && existing.submitterIpHash === ipHash;
    if (!ownedByUser && !ownedAnonymously) {
      await recordRejection(raw, "duplicate", user?.id, ipHash, deal.slug);
      return { error: `This ${deal.name} ${deal.noun} is already listed by someone else.` };
    }
    if (existing.status === PASS_STATUS.live) {
      await recordRejection(raw, "already_live", user?.id, ipHash, deal.slug);
      return { error: `This ${deal.name} ${deal.noun} is already on the board.` };
    }
    // Back on the board, with the expiry clock and the dead-report count reset - the
    // unlocks it already served still stand against the sender's allotment. The wave clock
    // restarts too, so a relisted pass is offered from the front of the queue again.
    existing.status = PASS_STATUS.live;
    existing.lastRefreshedAt = new Date();
    existing.waveStartedAt = new Date();
    existing.wavesNotified = 0;
    existing.waveCursor = 0;
    existing.deadCount = 0;
    await existing.save();
    logEvent("pass_relisted", {
      deal: deal.slug,
      pass: existing._id.toString(),
      user: user?.id || "anonymous",
    });
    await notify(deal, code, user, "back on the board");
  } else {
    if (!user) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = await Pass.countDocuments({ submitterIpHash: ipHash, createdAt: { $gte: cutoff } });
      if (recent >= ANONYMOUS_SUBMISSIONS_PER_DAY) {
        await recordRejection(raw, "rate_limited", undefined, ipHash, deal.slug);
        return { error: "Too many passes were submitted from this connection today. Try again tomorrow." };
      }
    }

    const created = await Pass.create({
      deal: deal.slug,
      code,
      ...(submitterUserId ? { submitterUserId } : {}),
      submitterIpHash: ipHash,
    });
    logEvent("pass_submitted", {
      deal: deal.slug,
      pass: created._id.toString(),
      user: user?.id || "anonymous",
    });
    await notify(deal, code, user, "listed");
  }

  revalidatePath(deal.path);
  revalidatePath("/manage");
  if (user) redirect("/manage");
  return {
    success:
      deal.slug === DEFAULT_DEAL
        ? "Your pass is live. Thank you for giving someone a chance to use Claude."
        : `Your ${deal.name} ${deal.noun} is live. Thank you - someone in the queue gets ${deal.reward}.`,
  };
}

// Awaited rather than fired and forgotten: a serverless function can be frozen the moment
// it responds, which would drop a pending send. Every call swallows its own failures, so
// this can never cost the submitter their listing.
async function notify(
  deal: Deal,
  code: string,
  user: { email: string; name?: string } | null,
  what: string
): Promise<void> {
  const livePasses = await countLivePasses(deal.slug);
  await notifyNewPass({
    deal,
    code,
    submitterEmail: user?.email,
    submitterName: user?.name ? `${user.name} - ${what}` : user ? undefined : `Anonymous - ${what}`,
    livePasses,
  });

  // Numbers first, then the offer: anyone who has let three turns go by is moved to the
  // back before wave 1 is drawn, so a demotion never lands underneath a live offer.
  await demoteNoShows(deal.slug);
  await advanceWaves();
}
