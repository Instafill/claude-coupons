import { headers } from "next/headers";

import { hashIp } from "@/lib/passes";

// The one place that turns a request into the salted IP hash the throttles key on. Both
// the header-reading shapes Next offers end up here, so no route re-types the header dance.
export function ipHashFromHeaderList(list: Headers): string {
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return hashIp(forwarded || list.get("x-real-ip") || "unknown");
}

export async function ipHashFromHeaders(): Promise<string> {
  return ipHashFromHeaderList(await headers());
}
