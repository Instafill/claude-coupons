import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Types } from "mongoose";

import { getUser } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { UNLOCKS_PER_PASS } from "@/lib/passes";
import Pass, { PASS_STATUS } from "@/models/Pass";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My passes - Claude Coupons",
  robots: { index: false },
};

const STATUS_STYLE: Record<string, string> = {
  live: "bg-[#e2f2e9] text-good",
  dead: "bg-[#f9e5e0] text-bad",
  expired: "bg-[#f9e5e0] text-bad",
};

export default async function ManagePage() {
  const user = await getUser();
  if (!user) redirect("/signin?return_to=%2Fmanage");

  await dbConnect();
  const listings = await Pass.find({
    submitterUserId: new Types.ObjectId(user.id),
    status: { $ne: PASS_STATUS.removed },
  }).sort({ createdAt: -1 });

  return (
    <section className="mx-auto mt-8 max-w-2xl">
      <h1 className="text-[28px] font-bold">My passes</h1>
      <p className="mt-1">
        Signed in as <strong>{user.email}</strong>.
      </p>

      {listings.length === 0 ? (
        <p className="mt-4">
          You haven&rsquo;t listed any passes yet.{" "}
          <a className="text-accent-dark underline" href="/submit">
            Share one now
          </a>
          .
        </p>
      ) : (
        <>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-[15px]">
              <thead>
                <tr className="text-xs tracking-wide text-muted uppercase">
                  {["Pass", "Status", "Unlocked", "Claimed", "Dead reports"].map((h) => (
                    <th key={h} className="border-b border-line px-2.5 py-2 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listings.map((pass) => (
                  <tr key={pass._id.toString()}>
                    <td className="border-b border-line px-2.5 py-2 font-mono">
                      …/{pass.code}
                    </td>
                    <td className="border-b border-line px-2.5 py-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${
                          STATUS_STYLE[pass.status] ?? "bg-[#f0ede6]"
                        }`}
                      >
                        {pass.status}
                      </span>
                    </td>
                    <td className="border-b border-line px-2.5 py-2">{pass.unlockCount}</td>
                    <td className="border-b border-line px-2.5 py-2">{pass.claimedCount}</td>
                    <td className="border-b border-line px-2.5 py-2">{pass.deadCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted">
            A listing hides itself after {UNLOCKS_PER_PASS} unlocks, after repeated
            &ldquo;didn&rsquo;t work&rdquo; reports, or 21 days on the board. Still have passes
            on a link that stopped showing?{" "}
            <a className="text-accent-dark underline" href="/submit">
              Paste it in again
            </a>{" "}
            and it goes back up.
          </p>
        </>
      )}
    </section>
  );
}
