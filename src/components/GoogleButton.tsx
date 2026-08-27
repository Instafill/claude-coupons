"use client";

import { track } from "@vercel/analytics";

// A plain link, but it needs to be a client component so the click can be counted before
// the browser leaves for accounts.google.com.
export default function GoogleButton({ returnTo }: { returnTo: string }) {
  return (
    <a
      href={`/api/auth/signin?return_to=${encodeURIComponent(returnTo)}`}
      rel="nofollow"
      onClick={() => track("signin_started", { method: "google" })}
      className="mt-5 block rounded-lg border border-line bg-surface px-4 py-2.5 text-center font-semibold hover:bg-[#f4f2ec]"
    >
      Continue with Google
    </a>
  );
}
