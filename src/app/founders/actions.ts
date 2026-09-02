"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Types } from "mongoose";

import { isAdmin } from "@/lib/admin";
import { getUser } from "@/lib/auth";
import { addCoupons, isCouponKind, parseBulkCodes, revokeCoupon } from "@/lib/coupons";
import { releaseDrop } from "@/lib/drops";
import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import { canManage, requestOwnership } from "@/lib/ownership";
import { createProduct, getProductBySlug, validateProduct } from "@/lib/products";
import { notifyAdmin } from "@/lib/sendgrid";
import { baseUrl } from "@/lib/watchers";
import Product, { PRODUCT_SOURCE } from "@/models/Product";

// Everything a founder can do to their page. Every action starts the same way: who is
// asking, which page, and may they - then the honeypot. Following app/actions.ts.

export interface ActionState {
  error?: string;
  success?: string;
}

const PRODUCTS_PER_USER_PER_DAY = 3;

function str(form: FormData, key: string): string {
  return String(form.get(key) || "").trim();
}

function num(form: FormData, key: string): number | undefined {
  const raw = str(form, key);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

async function managed(slug: string) {
  const user = await getUser();
  if (!user) return { error: "Sign in first." } as const;
  const product = await getProductBySlug(slug, { includeArchived: true });
  if (!product) return { error: "That page doesn't exist." } as const;
  if (!canManage(product, user)) return { error: "This page isn't yours to edit." } as const;
  return { user, product } as const;
}

function refresh(slug: string) {
  revalidatePath(`/coupons/${slug}`);
  revalidatePath(`/founders/${slug}`);
  revalidatePath("/coupons");
  revalidatePath("/");
}

export async function createProductAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: "Sign in first." };
  if (str(form, "website")) {
    logEvent("honeypot_tripped", { where: "founders_new" });
    return { error: "That submission could not be accepted." };
  }

  await dbConnect();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await Product.countDocuments({ createdByUserId: new Types.ObjectId(user.id), createdAt: { $gte: cutoff } });
  if (recent >= PRODUCTS_PER_USER_PER_DAY && !isAdmin(user)) {
    return { error: "You've created several pages today. Try again tomorrow." };
  }

  const result = await createProduct(
    {
      name: str(form, "name"),
      tagline: str(form, "tagline"),
      description: str(form, "description"),
      websiteUrl: str(form, "websiteUrl"),
      logoUrl: str(form, "logoUrl"),
      threshold: num(form, "threshold"),
    },
    { source: PRODUCT_SOURCE.founder, createdByUserId: user.id, ownerUserId: user.id }
  );
  if ("error" in result) return { error: result.error };

  logEvent("product_created", { product: result.product._id.toString(), user: user.id, source: "founder" });
  await notifyAdmin(
    `New product page: ${result.product.name}`,
    [`${user.email} created /coupons/${result.product.slug} (${result.product.websiteDomain}).`],
    `${baseUrl()}/coupons/${result.product.slug}`
  );
  refresh(result.product.slug);
  redirect(`/founders/${result.product.slug}`);
}

export async function updateProductAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await managed(str(form, "slug"));
  if ("error" in ctx) return { error: ctx.error };
  const { product } = ctx;

  const checked = validateProduct({
    name: str(form, "name"),
    tagline: str(form, "tagline"),
    description: str(form, "description"),
    websiteUrl: str(form, "websiteUrl"),
    logoUrl: str(form, "logoUrl"),
    threshold: product.threshold,
    slug: product.slug,
  });
  if (!checked.ok) return { error: checked.error };
  const { value } = checked;

  await Product.updateOne(
    { _id: product._id },
    {
      $set: {
        name: value.name,
        tagline: value.tagline,
        description: value.description,
        websiteUrl: value.websiteUrl,
        websiteDomain: value.websiteDomain,
        ...(value.logoUrl ? { logoUrl: value.logoUrl } : {}),
      },
      ...(value.logoUrl ? {} : { $unset: { logoUrl: "" } }),
    }
  );
  logEvent("product_updated", { product: product._id.toString() });
  refresh(product.slug);
  return { success: "Saved." };
}

export async function setThresholdAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await managed(str(form, "slug"));
  if ("error" in ctx) return { error: ctx.error };
  const threshold = num(form, "threshold");
  if (!threshold || !Number.isInteger(threshold) || threshold < 5 || threshold > 100000) {
    return { error: "The goal should be a whole number between 5 and 100,000." };
  }
  await Product.updateOne({ _id: ctx.product._id }, { $set: { threshold } });
  logEvent("product_threshold", { product: ctx.product._id.toString(), threshold });
  refresh(ctx.product.slug);
  return { success: `Goal set to ${threshold}.` };
}

export async function acceptWarrantAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await managed(str(form, "slug"));
  if ("error" in ctx) return { error: ctx.error };
  if (!form.get("warrant")) return { error: "Tick the box to confirm you can issue these codes." };
  await Product.updateOne({ _id: ctx.product._id }, { $set: { warrantAcceptedAt: new Date() } });
  logEvent("product_warrant", { product: ctx.product._id.toString(), user: ctx.user.id });
  refresh(ctx.product.slug);
  return { success: "Thanks. You can load codes now." };
}

export async function addCouponsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await managed(str(form, "slug"));
  if ("error" in ctx) return { error: ctx.error };
  const { product, user } = ctx;
  if (!product.warrantAcceptedAt) return { error: "Confirm you can issue these codes first." };

  const { codes, rejected } = parseBulkCodes(str(form, "codes"));
  if (codes.length === 0) return { error: "Paste at least one code, one per line." };
  const kind = str(form, "kind");
  if (!isCouponKind(kind)) return { error: "Pick what the code gives." };
  const value = num(form, "value");
  if (kind !== "custom" && (!value || value <= 0)) return { error: "Give the amount - percent, dollars or days." };
  const maxClaims = num(form, "maxClaims") ?? 1;
  if (!Number.isInteger(maxClaims) || maxClaims < 1 || maxClaims > 100000) return { error: "Uses per code must be a whole number." };
  const redeemUrl = str(form, "redeemUrl");
  if (redeemUrl && !redeemUrl.startsWith("https://")) return { error: "The redeem link has to start with https://." };
  const expiresRaw = str(form, "expiresAt");
  const expiresAt = expiresRaw ? new Date(expiresRaw) : undefined;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return { error: "That expiry date didn't parse." };

  const { added, duplicates } = await addCoupons({
    productId: product._id,
    codes,
    kind,
    value: kind === "custom" ? undefined : value,
    note: str(form, "note").slice(0, 60),
    terms: str(form, "terms").slice(0, 300) || undefined,
    redeemUrl: redeemUrl || undefined,
    expiresAt,
    maxClaims,
    createdByUserId: new Types.ObjectId(user.id),
  });
  logEvent("coupons_added", { product: product._id.toString(), added, duplicates, rejected: rejected.length });
  refresh(product.slug);
  const notes = [
    `${added} code${added === 1 ? "" : "s"} loaded.`,
    duplicates ? `${duplicates} already listed and skipped.` : "",
    rejected.length ? `${rejected.length} didn't look like codes and were ignored.` : "",
  ].filter(Boolean);
  return { success: notes.join(" ") };
}

export async function revokeCouponAction(slug: string, couponId: string): Promise<void> {
  const ctx = await managed(slug);
  if ("error" in ctx) return;
  const ok = await revokeCoupon(ctx.product._id, couponId);
  if (ok) logEvent("coupon_revoked", { product: ctx.product._id.toString() });
  refresh(ctx.product.slug);
}

export async function releaseNowAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await managed(str(form, "slug"));
  if ("error" in ctx) return { error: ctx.error };
  const { product, user } = ctx;
  if (!product.warrantAcceptedAt) return { error: "Confirm you can issue these codes first." };

  const result = await releaseDrop(product, isAdmin(user) && !product.ownerUserId?.equals(new Types.ObjectId(user.id)) ? "admin" : "founder");
  refresh(product.slug);
  if (!result.ok) return { error: result.error };
  if (result.done) {
    return {
      success:
        result.sent > 0
          ? `Drop #${result.drop.number} is live. Emailed ${result.sent} people just now; everyone on the list has been told.`
          : `Drop #${result.drop.number} is live and everyone on the list has been told.`,
    };
  }
  return {
    success: `Drop #${result.drop.number} is live. Sent ${result.sent} this time; ${result.remaining} still to email - press Release again to continue.`,
  };
}

export async function requestOwnershipAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: "Sign in first." };
  if (str(form, "website")) {
    logEvent("honeypot_tripped", { where: "founders_claim" });
    return { error: "That submission could not be accepted." };
  }
  const product = await getProductBySlug(str(form, "slug"));
  if (!product) return { error: "That page doesn't exist." };

  const outcome = await requestOwnership(product, user, str(form, "note"));
  if (outcome.status === "error") return { error: outcome.error };
  refresh(product.slug);
  if (outcome.status === "approved") redirect(`/founders/${product.slug}`);
  return {
    success: `Request received. ${user.email} isn't on ${product.websiteDomain}, so a person will check it - usually within a day - and email you either way.`,
  };
}
