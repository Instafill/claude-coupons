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
          <Link href="/" className="flex items-center gap-2 text-[19px] font-bold no-underline">
            {/* Raster, not the zip's logo.svg: that file is a broken redraw - the % comes
                out as two solid blobs and the ticket edge as a row of dots. */}
            <Image src="/logo-256.png" alt="" width={28} height={28} priority />
            {/* One flex item, so the gap sits between logo and wordmark only - a bare text
                node would become its own item and push ".com" away. */}
            <span>
              ClaudeCoupons<span className="font-normal text-muted">.com</span>
            </span>
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
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <a
              className="flex items-center gap-1.5 hover:text-accent-dark"
              href="https://github.com/Instafill/claude-coupons"
              rel="noopener"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Source on GitHub
            </a>
            <a
              className="flex items-center gap-1.5 hover:text-accent-dark"
              href="https://x.com/ogamaniuk"
              rel="noopener"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" />
              </svg>
              Built by @ogamaniuk
            </a>
          </p>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
