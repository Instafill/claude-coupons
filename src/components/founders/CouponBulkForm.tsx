"use client";

import { useActionState, useState } from "react";

import { addCouponsAction, type ActionState } from "@/app/founders/actions";
import ActionMessage from "@/components/founders/ActionMessage";

const INPUT = "rounded-lg border border-line bg-surface px-3 py-2 outline-accent";

const KINDS = [
  { value: "percent", label: "Percent off", unit: "%" },
  { value: "fixed", label: "Amount off", unit: "$" },
  { value: "free_days", label: "Free days", unit: "days" },
  { value: "custom", label: "Something else", unit: "" },
];

export default function CouponBulkForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addCouponsAction, {});
  const [kind, setKind] = useState("percent");
  const unit = KINDS.find((k) => k.value === kind)?.unit ?? "";

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Codes, one per line
        <textarea name="codes" required rows={6} className={`${INPUT} font-mono text-[14px]`} placeholder={"LAUNCH-7F3K\nLAUNCH-9Q2M\n..."} />
        <span className="text-[13px] font-normal text-muted">
          Unique one-time codes are safest: a shared code leaks the moment one person posts it. Up to 500 at a
          time; duplicates of codes already listed are skipped and reported.
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Each code gives
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={INPUT}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        {kind !== "custom" && (
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Amount {unit && <span className="font-normal text-muted">({unit})</span>}
            <input name="value" type="number" min={1} step="any" required className={INPUT} />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Uses per code
          <input name="maxClaims" type="number" min={1} defaultValue={1} className={INPUT} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-semibold">
        Short label <span className="font-normal text-muted">(shown on the page, e.g. &ldquo;first year&rdquo; or &ldquo;Pro plan&rdquo;)</span>
        <input name="note" maxLength={60} className={INPUT} placeholder={kind === "custom" ? "Lifetime deal, Pro plan" : "first year"} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Redeem link <span className="font-normal text-muted">(optional)</span>
          <input name="redeemUrl" type="url" className={INPUT} placeholder="https://yourproduct.com/pricing" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Codes expire <span className="font-normal text-muted">(optional)</span>
          <input name="expiresAt" type="date" className={INPUT} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Terms <span className="font-normal text-muted">(optional, one sentence)</span>
        <input name="terms" maxLength={300} className={INPUT} placeholder="New accounts only. Cannot be combined with other offers." />
      </label>

      <ActionMessage state={state} />
      <button type="submit" disabled={pending} className="cursor-pointer self-start rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-dark disabled:opacity-60">
        {pending ? "Loading..." : "Load codes"}
      </button>
    </form>
  );
}
