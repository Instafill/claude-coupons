import type { Metadata } from "next";
import { redirect } from "next/navigation";

import GoogleButton from "@/components/GoogleButton";
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
        Signing in is for people who list passes: it gives you a dashboard of your listings.
        To unlock a pass, join the list on the home page instead - confirming your email is
        the sign-in. No password either way.
      </p>

      {params.error && (
        <p className="mt-3 font-medium text-bad">{ERRORS[params.error] ?? ERRORS.google}</p>
      )}

      <GoogleButton returnTo={returnTo} />
      <p className="my-1 text-center text-[13px] text-muted">or</p>

      <SignInForm returnTo={returnTo} />
    </section>
  );
}
