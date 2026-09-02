"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";

import { requireAdmin } from "@/lib/admin";
import { logEvent } from "@/lib/events";
import { dbConnect } from "@/lib/mongodb";
import { decideOwnership } from "@/lib/ownership";
import { createProduct } from "@/lib/products";
import Product, { PRODUCT_SOURCE, PRODUCT_STATUS } from "@/models/Product";

// The operator's levers. Every one starts with requireAdmin; nothing here trusts a form.

export interface AdminState {
  error?: string;
  success?: string;
}

function str(form: FormData, key: string): string {
  return String(form.get(key) || "").trim();
}

function refresh(slug?: string) {
  revalidatePath("/admin");
  revalidatePath("/coupons");
  revalidatePath("/");
  if (slug) revalidatePath(`/coupons/${slug}`);
}

// A page for a product whose makers have not joined. Public and labelled unofficial from
// the first request.
export async function createUnofficialProductAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admins only." };

  const threshold = Number(str(form, "threshold") || 100);
  const result = await createProduct(
    {
      name: str(form, "name"),
      tagline: str(form, "tagline"),
      description: str(form, "description"),
      websiteUrl: str(form, "websiteUrl"),
      logoUrl: str(form, "logoUrl"),
      slug: str(form, "slug") || undefined,
      threshold: Number.isFinite(threshold) ? threshold : undefined,
    },
    { source: PRODUCT_SOURCE.admin, createdByUserId: admin.id }
  );
  if ("error" in result) return { error: result.error };
  logEvent("product_created", { product: result.product._id.toString(), user: admin.id, source: "admin" });
  refresh(result.product.slug);
  return { success: `Created /coupons/${result.product.slug}.` };
}

export async function decideOwnershipAction(requestId: string, approve: boolean): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;
  await decideOwnership(requestId, approve, admin);
  refresh();
}

// The kill switch: for a trademark complaint, a dead product, or a page that turned out
// to be junk. The page answers 404 and leaves the sitemap; the rows stay for the record.
export async function setArchivedAction(productId: string, archived: boolean): Promise<void> {
  const admin = await requireAdmin();
  if (!admin || !Types.ObjectId.isValid(productId)) return;
  await dbConnect();
  const product = await Product.findOneAndUpdate(
    { _id: new Types.ObjectId(productId) },
    { $set: { status: archived ? PRODUCT_STATUS.archived : PRODUCT_STATUS.published } },
    { returnDocument: "after" }
  );
  if (product) {
    logEvent(archived ? "product_archived" : "product_restored", { product: product._id.toString(), user: admin.id });
    refresh(product.slug);
  }
}
