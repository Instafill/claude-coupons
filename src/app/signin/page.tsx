import type { Metadata } from "next";
import { redirect } from "next/navigation";

import SignInForm from "@/components/SignInForm";
import { getUser, safeReturnTo } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in - Claude Coupons",
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  link: "That sign-in link is invalid or has expired. Request a fresh one.",
  google: "Google sign-in didn't complete. Try again, or use the email link.",
  noemail: "Google didn't hand back an email address. Try the email link instead.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string; error?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.return_to);

  const user = await getUser();
  if (user) redirect(returnTo);

  return (
    <section className="mx-auto mt-8 max-w-md">
      <h1 className="text-[28px] font-bold">Sign in</h1>
      <p className="mt-2 text-muted">
        Signing in is what unlocks pass links - it keeps bots off the board and lets us retire
        exhausted passes quickly. No password either way.
      </p>

      {params.error && (
        <p className="mt-3 font-medium text-bad">{ERRORS[params.error] ?? ERRORS.google}</p>
      )}

      <a
        href={`/api/auth/signin?return_to=${encodeURIComponent(returnTo)}`}
        rel="nofollow"
        className="mt-5 block rounded-lg border border-line bg-surface px-4 py-2.5 text-center font-semibold hover:bg-[#f4f2ec]"
      >
        Continue with Google
      </a>
      <p className="my-1 text-center text-[13px] text-muted">or</p>

      <SignInForm returnTo={returnTo} />
    </section>
  );
}
