import { Types } from "mongoose";

import type { SessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { emailDomain, isFreemail, registrableDomain } from "@/lib/domains";
import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import { notifyAdmin, sendOwnershipDecision } from "@/lib/sendgrid";
import { baseUrl } from "@/lib/watchers";
import OwnershipRequest, { IOwnershipRequest, OWNERSHIP_STATUS } from "@/models/OwnershipRequest";
import Product, { IProduct } from "@/models/Product";
import User from "@/models/User";

// Who may run a page. The owner is whoever claimed it; the admin can manage every page,
// which is what lets codes be loaded for a product whose founder is still being courted.

export function isOwner(product: IProduct, user: SessionUser | null): boolean {
  return Boolean(user && product.ownerUserId && product.ownerUserId.toString() === user.id);
}

export function canManage(product: IProduct, user: SessionUser | null): boolean {
  return isOwner(product, user) || isAdmin(user);
}

async function grant(product: IProduct, request: IOwnershipRequest, status: string, decidedBy?: string): Promise<void> {
  await Product.updateOne(
    { _id: product._id, ownerUserId: { $exists: false } },
    { $set: { ownerUserId: request.userId, claimedAt: new Date() } }
  );
  await OwnershipRequest.updateOne(
    { _id: request._id },
    { $set: { status, decidedAt: new Date(), ...(decidedBy ? { decidedByUserId: new Types.ObjectId(decidedBy) } : {}) } }
  );
  await sendOwnershipDecision(request.email, {
    productName: product.name,
    approved: true,
    url: `${baseUrl()}/founders/${product.slug}`,
  });
  logEvent("ownership_granted", { product: product._id.toString(), user: request.userId.toString(), how: status });
}

export type OwnershipOutcome =
  | { status: "approved" }
  | { status: "pending" }
  | { status: "error"; error: string };

/**
 * "I run this product." Approved on the spot when the signed-in address is on the
 * product's own domain - a gmail address proves nothing, and a match on the domain is the
 * one thing a stranger cannot fake without owning the mailbox. Everything else waits for
 * the admin.
 */
export async function requestOwnership(product: IProduct, user: SessionUser, note: string): Promise<OwnershipOutcome> {
  await dbConnect();
  if (product.ownerUserId) return { status: "error", error: "This page already has an owner." };

  const domain = emailDomain(user.email);
  const existing = await OwnershipRequest.findOne({ productId: product._id, userId: new Types.ObjectId(user.id) });
  if (existing?.status === OWNERSHIP_STATUS.pending) return { status: "pending" };
  if (existing?.status === OWNERSHIP_STATUS.rejected)
    return { status: "error", error: "A previous request from this account was declined. Email hello@claudecoupons.com from an address on the product's domain." };

  const request =
    existing ??
    (await OwnershipRequest.create({
      productId: product._id,
      userId: new Types.ObjectId(user.id),
      email: user.email,
      emailDomain: domain,
      note: note.slice(0, 500),
    }));

  const matches = !isFreemail(user.email) && registrableDomain(domain) === product.websiteDomain;
  if (matches) {
    await grant(product, request, OWNERSHIP_STATUS.auto_approved);
    await notifyAdmin(`Page claimed: ${product.name}`, [`${user.email} claimed /coupons/${product.slug} (domain match).`], `${baseUrl()}/coupons/${product.slug}`);
    return { status: "approved" };
  }

  await notifyAdmin(
    `Ownership request: ${product.name}`,
    [`${user.email} says they run ${product.name} (${product.websiteDomain}).`, note ? `Note: ${note.slice(0, 300)}` : "No note."],
    `${baseUrl()}/admin`
  );
  logEvent("ownership_requested", { product: product._id.toString(), user: user.id });
  return { status: "pending" };
}

export async function decideOwnership(requestId: string, approve: boolean, admin: SessionUser): Promise<boolean> {
  await dbConnect();
  if (!Types.ObjectId.isValid(requestId)) return false;
  const request = await OwnershipRequest.findOne({ _id: new Types.ObjectId(requestId), status: OWNERSHIP_STATUS.pending });
  if (!request) return false;
  const product = await Product.findById(request.productId);
  if (!product) return false;

  if (approve) {
    if (product.ownerUserId) return false;
    await grant(product, request, OWNERSHIP_STATUS.approved, admin.id);
    return true;
  }
  await OwnershipRequest.updateOne(
    { _id: request._id },
    { $set: { status: OWNERSHIP_STATUS.rejected, decidedAt: new Date(), decidedByUserId: new Types.ObjectId(admin.id) } }
  );
  await sendOwnershipDecision(request.email, { productName: product.name, approved: false, url: `${baseUrl()}/coupons/${product.slug}` });
  logEvent("ownership_rejected", { product: product._id.toString(), user: request.userId.toString() });
  return true;
}

export async function ownerEmail(product: IProduct): Promise<string | null> {
  if (!product.ownerUserId) return null;
  const owner = await User.findById(product.ownerUserId).select("email");
  return owner?.email ?? null;
}
