"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { BoardPass } from "@/lib/passes";

type Outcome = "claimed" | "dead";

interface CardState {
  code: string | null;
  // null = nothing to ask; "hidden" = unlocked but not yet returned from claude.ai;
  // "asking" = the visitor is back and the question is on screen; "done" = answered.
  ask: null | "hidden" | "asking" | "done";
  busy: boolean;
  error: string | null;
}

export default function Board({
  passes,
  signedIn,
  maxClaims,
  dailyCap,
}: {
  passes: BoardPass[];
  signedIn: boolean;
  maxClaims: number;
  dailyCap: number;
}) {
  const [state, setState] = useState<Record<string, CardState>>(() =>
    Object.fromEntries(
      passes.map((p) => [
        p.id,
        {
          code: p.code,
          ask: p.code && p.unlockedOutcome === "none" ? "hidden" : null,
          busy: false,
          error: null,
        } satisfies CardState,
      ])
    )
  );

  const router = useRouter();

  // Which card is waiting for an answer while the visitor is away on claude.ai.
  const pending = useRef<string | null>(null);

  const patch = useCallback((id: string, next: Partial<CardState>) => {
    setState((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));
  }, []);

  // Opening a pass means leaving for claude.ai. When the tab comes back, surface the
  // question while claude.ai's answer is still on the visitor's screen - they are the
  // only validity check that exists, since claude.ai tells automation nothing.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const id = pending.current;
      if (!id) return;
      pending.current = null;
      setState((prev) =>
        prev[id]?.ask === "hidden" ? { ...prev, [id]: { ...prev[id], ask: "asking" } } : prev
      );
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  async function unlock(id: string) {
    patch(id, { busy: true, error: null });
    try {
      const res = await fetch(`/api/passes/${id}/unlock`, { method: "POST" });
      if (res.status === 401) {
        // The cookie expired between the page render and this click.
        router.push("/signin?return_to=%2F");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      patch(id, { code: data.code, ask: "hidden", busy: false });
      pending.current = id;
      window.open(data.url, "_blank", "noopener");
    } catch (err) {
      patch(id, { busy: false, error: err instanceof Error ? err.message : "Failed." });
    }
  }

  async function answer(id: string, result: Outcome) {
    patch(id, { ask: "done" });
    await fetch(`/api/passes/${id}/outcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    });
  }

  if (passes.length === 0) {
    return (
      <p className="text-sm text-muted">
        No passes on the board right now - they go fast. Check back soon, or{" "}
        <a className="text-accent-dark underline" href="/submit">
          list yours
        </a>{" "}
        if you have spares.
      </p>
    );
  }

  return (
    <>
      <ul className="grid gap-3">
        {passes.map((pass) => {
          const card = state[pass.id];
          return (
            <li
              key={pass.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-paper px-4 py-4"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-mono text-[15px] break-all">
                  claude.ai/referral/{card.code ?? pass.maskedCode}
                </span>
                <span className="text-[13px] text-muted">
                  {pass.claimedCount === 0
                    ? "no claims reported yet"
                    : `${pass.claimedCount} of ${maxClaims} claims reported`}{" "}
                  · listed{" "}
                  {new Date(pass.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {card.error && <span className="text-[13px] text-bad">{card.error}</span>}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {!signedIn ? (
                  <a
                    href="/signin?return_to=%2F"
                    rel="nofollow"
                    className="rounded-lg bg-accent px-4 py-2 text-[15px] font-semibold text-white hover:bg-accent-dark"
                  >
                    Sign in to unlock
                  </a>
                ) : card.code ? (
                  <>
                    <a
                      href={`https://claude.ai/referral/${card.code}`}
                      target="_blank"
                      rel="nofollow noopener"
                      onClick={() => {
                        if (state[pass.id].ask === "hidden") pending.current = pass.id;
                      }}
                      className="rounded-lg bg-good px-4 py-2 text-[15px] font-semibold text-white hover:brightness-90"
                    >
                      Open your pass ↗
                    </a>
                    {card.ask === "asking" && (
                      <span className="outcome-pulse flex flex-wrap items-center gap-1.5 text-sm text-muted">
                        Did it work?
                        <button
                          onClick={() => answer(pass.id, "claimed")}
                          className="cursor-pointer rounded-md border border-line bg-surface px-2.5 py-0.5 text-[13px] hover:border-accent"
                        >
                          ✓ Claimed it
                        </button>
                        <button
                          onClick={() => answer(pass.id, "dead")}
                          className="cursor-pointer rounded-md border border-line bg-surface px-2.5 py-0.5 text-[13px] hover:border-bad hover:text-bad"
                        >
                          ✗ Didn&rsquo;t work
                        </button>
                      </span>
                    )}
                    {card.ask === "done" && (
                      <span className="text-sm text-good">
                        Thanks - that keeps the board honest.
                      </span>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => unlock(pass.id)}
                    disabled={card.busy}
                    className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-[15px] font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
                  >
                    {card.busy ? "Unlocking…" : "Unlock this pass"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {/* mt-auto anchors the caveat to the bottom of the stretched panel. */}
      <p className="mt-auto pt-4 text-sm text-muted">
        Passes are first-come, first-served and each covers a limited number of invites, so a
        link can run dry before the board knows. Unlocking is capped at {dailyCap} passes per
        day.
      </p>
    </>
  );
}
