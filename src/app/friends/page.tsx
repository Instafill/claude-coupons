import type { Metadata } from "next";

import { FRIENDS } from "@/lib/friends";

export const metadata: Metadata = {
  title: "Our Friends - Claude Coupons",
  description:
    "The people and tools behind ClaudeCoupons.com. Some we built, some belong to friends - all of them worth a look.",
  alternates: { canonical: "https://claudecoupons.com/friends" },
};

export default function FriendsPage() {
  return (
    <section className="mx-auto mt-8 max-w-2xl">
      <h1 className="text-[28px] font-bold">Our friends</h1>
      <p className="mt-2">
        The people and tools behind the work. Some of these are ours, some belong to friends,
        and one is a newsletter written on weekends. Nobody paid to be on this page - they are
        here because we use them or know the people who built them.
      </p>

      <ul className="mt-6 space-y-3">
        {FRIENDS.map(({ name, url, tag, blurb }) => (
          <li
            key={url}
            className="rounded-xl border border-line bg-paper px-4 py-4 transition-colors hover:border-accent"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <a
                className="text-[17px] font-bold text-accent-dark underline"
                href={url}
                rel="noopener"
              >
                {name}
              </a>
              <span className="rounded-full bg-[#f4e4da] px-2.5 py-0.5 text-[12px] font-semibold text-accent-dark">
                {tag}
              </span>
            </div>
            <p className="mt-1.5 text-[15px]">{blurb}</p>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-muted">
        Run something we should know about?{" "}
        <a className="text-accent-dark underline" href="https://x.com/ogamaniuk" rel="noopener">
          Tell us
        </a>
        .
      </p>
    </section>
  );
}
