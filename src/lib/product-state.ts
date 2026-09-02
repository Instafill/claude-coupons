// The pure half of lib/products.ts: shapes and arithmetic that client components need,
// with no database import behind them. Everything here is safe in the browser bundle.

import type { ProductFaq } from "@/models/Product";

// A page thinner than this is a doorway page, not a product page. Google treats it as one
// and so should we.
export const MIN_DESCRIPTION_WORDS = 60;
export const DEFAULT_THRESHOLD = 100;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export type PageState = "wanted" | "armed" | "live" | "sold_out";

export interface PublicProduct {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  websiteDomain: string;
  logoUrl: string | null;
  owned: boolean;
  threshold: number;
  baseline: number;
  confirmedCount: number;
  poolCapacity: number;
  dropCount: number;
  lastDropAt: string | null;
  faqs: ProductFaq[];
}

export interface PublicDrop {
  id: string;
  number: number;
  status: string;
  capacity: number;
  claimedCount: number;
  remaining: number;
  subscribersAtRelease: number;
  releasedAt: string | null;
  exhaustedAt: string | null;
}

// Mirrors DROP_STATUS in models/Drop.ts without importing the model.
const LIVE_STATUSES = new Set(["releasing", "released"]);

export function isDropLive(drop: { status: string; claimedCount: number; capacity: number } | null): boolean {
  return Boolean(drop && LIVE_STATUSES.has(drop.status) && drop.claimedCount < drop.capacity);
}

export function pageState(
  product: { owned: boolean } | { ownerUserId?: unknown },
  drop: { status: string; claimedCount: number; capacity: number } | null
): PageState {
  if (isDropLive(drop)) return "live";
  if (drop && drop.status === "exhausted") return "sold_out";
  const owned = "owned" in product ? product.owned : Boolean(product.ownerUserId);
  return owned ? "armed" : "wanted";
}

export interface Progress {
  n: number; // confirmed since the last release
  threshold: number;
  left: number;
  goalReached: boolean;
  // How the page talks about the queue. Small numbers are not emphasised: a bar at 2 of
  // 100 is a reason to leave, so the copy leads with the goal instead.
  band: "empty" | "few" | "many" | "goal";
}

export function progress(product: { confirmedCount: number; baseline: number; threshold: number }): Progress {
  const n = Math.max(0, product.confirmedCount - product.baseline);
  const left = Math.max(0, product.threshold - n);
  const goalReached = n >= product.threshold;
  const band = goalReached ? "goal" : n === 0 ? "empty" : n <= 5 ? "few" : "many";
  return { n, threshold: product.threshold, left, goalReached, band };
}

// "43 minutes", "2 hours", "3 days" - for the proof line under a finished drop.
export function describeDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

// "a***@gmail.com": enough for a founder to recognise a colleague, useless to a scraper.
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
}
