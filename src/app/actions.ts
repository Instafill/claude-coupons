"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Types } from "mongoose";

import { getUser } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { parseReferralCode } from "@/lib/passes";
import Pass, { PASS_STATUS } from "@/models/Pass";

export interface SubmitState {
  error?: string;
}

// Listing a pass requires an account, same as unlocking one.
export async function submitPass(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const user = await getUser();
  if (!user) redirect("/signin?return_to=%2Fsubmit");

  const code = parseReferralCode(String(formData.get("link") || ""));
  if (!code) {
    return {
      error:
        "Paste your personal invite link, e.g. https://claude.ai/referral/AbCd123456 - nothing else is accepted.",
    };
  }

  await dbConnect();
  if (await Pass.exists({ code })) {
    return { error: "This pass link is already listed." };
  }

  await Pass.create({ code, submitterUserId: new Types.ObjectId(user.id) });
  revalidatePath("/");
  redirect("/manage");
}

// Submitter self-service. Each action re-checks ownership, so a guessed id changes nothing.
async function updateOwnPass(passId: string, update: Record<string, unknown>) {
  const user = await getUser();
  if (!user || !Types.ObjectId.isValid(passId)) return;

  await dbConnect();
  await Pass.updateOne(
    { _id: new Types.ObjectId(passId), submitterUserId: new Types.ObjectId(user.id) },
    { $set: update }
  );
  revalidatePath("/manage");
  revalidatePath("/");
}

export async function refreshPass(formData: FormData) {
  await updateOwnPass(String(formData.get("id")), {
    lastRefreshedAt: new Date(),
    status: PASS_STATUS.live,
  });
}

export async function markExhausted(formData: FormData) {
  await updateOwnPass(String(formData.get("id")), { status: PASS_STATUS.exhausted });
}

export async function removePass(formData: FormData) {
  await updateOwnPass(String(formData.get("id")), { status: PASS_STATUS.removed });
}
