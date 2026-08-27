import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";

import { getUser } from "@/lib/auth";

import "./globals.css";

// Fallback only - every page sets its own title; the home page owns the one that matters.
export const metadata = {
  metadataBase: new URL("https://claudecoupons.com"),
  title: "Claude Code Passes | Claude Coupons",
  description:
    "Claim a free Claude Code pass or share yours. Every Claude pass gives a new user 7 days of Claude Pro - Claude Code and Cowork included.",
} satisfies Metadata;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser();

  return (
    <html lang="en">
      <body className="antialiased">
        <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <Link href="/" className="text-[19px] font-bold no-underline">
            🎟️ ClaudeCoupons<span className="font-normal text-muted">.com</span>
          </Link>
          <nav className="flex items-center gap-4 text-[15px]">
            <Link href="/submit" className="hover:text-accent-dark">
              Share a pass
            </Link>
            {user ? (
              <>
                {user.picture && (
                  // Saved from the Google profile at sign-in. Shown here so the stored
                  // avatar is visibly working, not just sitting in a column.
                  <Image
                    src={user.picture}
                    alt=""
                    width={28}
                    height={28}
                    title={user.name || user.email}
                    className="rounded-full"
                    unoptimized
                  />
                )}
                <Link href="/manage" className="hover:text-accent-dark">
                  My passes
                </Link>
                <form action="/api/auth/signout" method="post" className="inline">
                  <button type="submit" className="cursor-pointer hover:text-accent-dark">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link href="/signin" className="hover:text-accent-dark">
                Sign in
              </Link>
            )}
          </nav>
        </header>

        <main className="mx-auto max-w-5xl px-5 pb-16">{children}</main>

        <footer className="mx-auto max-w-5xl border-t border-line px-5 pt-6 pb-10 text-[13px] text-muted">
          <p>
            ClaudeCoupons.com is a community exchange for{" "}
            <a
              className="text-accent-dark underline"
              href="https://support.claude.com/en/articles/13456702-claude-code-and-cowork-guest-passes"
              rel="noopener"
            >
              Claude Code and Cowork guest passes
            </a>
            . Pass links are personal referral links; whoever shared one (including us) may
            earn usage credits from Anthropic if you later subscribe. Claiming a pass requires
            a payment card and the account converts to a paid Claude Pro subscription after 7
            days unless canceled.
          </p>
          <p className="mt-2">
            Not affiliated with or endorsed by Anthropic. Claude is a trademark of Anthropic,
            PBC.
          </p>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
