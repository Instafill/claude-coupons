import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Types } from "mongoose";

import { markExhausted, refreshPass, removePass } from "@/app/actions";
import { getUser } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { MAX_CLAIMS_PER_PASS } from "@/lib/passes";
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
                  {["Pass", "Status", "Unlocked", "Claimed", "Dead reports", ""].map((h) => (
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
                    <td className="border-b border-line px-2.5 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        <form action={refreshPass}>
                          <input type="hidden" name="id" value={pass._id.toString()} />
                          <button
                            type="submit"
                            title="Relist and reset the expiry clock"
                            className="cursor-pointer rounded-md border border-line bg-surface px-2.5 py-0.5 text-[13px] hover:border-accent"
                          >
                            Refresh
                          </button>
                        </form>
                        {pass.status === PASS_STATUS.live && (
                          <form action={markExhausted}>
                            <input type="hidden" name="id" value={pass._id.toString()} />
                            <button
                              type="submit"
                              title="No passes left on this link"
                              className="cursor-pointer rounded-md border border-line bg-surface px-2.5 py-0.5 text-[13px] hover:border-accent"
                            >
                              Out of passes
                            </button>
                          </form>
                        )}
                        <form action={removePass}>
                          <input type="hidden" name="id" value={pass._id.toString()} />
                          <button
                            type="submit"
                            className="cursor-pointer rounded-md border border-line bg-surface px-2.5 py-0.5 text-[13px] hover:border-bad hover:text-bad"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted">
            A listing hides itself after {MAX_CLAIMS_PER_PASS} reported claims, after repeated
            &ldquo;didn&rsquo;t work&rdquo; reports, or 21 days after its last refresh. Refresh
            it whenever you still have passes to give.
          </p>
        </>
      )}
    </section>
  );
}
