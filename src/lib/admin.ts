import { redirect } from "next/navigation";

import { getUser, type SessionUser } from "@/lib/auth";

// The site operator. A comma-separated list of addresses in ADMIN_EMAILS; the session
// cookie is HMAC-signed (lib/auth.ts), so the address inside it can be trusted here.
function admins(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdmin(user: SessionUser | null | undefined): boolean {
  return Boolean(user && admins().has(user.email.toLowerCase()));
}

/** For pages: bounces a stranger to sign-in and a non-admin to the home page. */
export async function requireAdminPage(returnTo: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(`/signin?return_to=${encodeURIComponent(returnTo)}`);
  if (!isAdmin(user)) redirect("/");
  return user;
}

/** For server actions: returns null rather than redirecting, so the caller can answer. */
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getUser();
  return isAdmin(user) ? user : null;
}
