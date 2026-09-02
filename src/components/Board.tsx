"use client";

import { track } from "@vercel/analytics";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { BoardPass } from "@/lib/passes";

type Outcome = "claimed" | "dead";

interface CardState {
  code: string | null;
  ask: null | "hidden" | "asking" | "done";
  busy: boolean;
  error: string | null;
}

// `myWave` is the gate: null means the visitor has no number yet, and a number higher
// than the pass's open wave means their turn has not come round. Either way the button
// says what would fix it. Signing in on its own opens nothing.
export default function Board({
  passes,
  myWave,
  unlocksPerPass,
}: {
  passes: BoardPass[];
  myWave: number | null;
  unlocksPerPass: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState<"next" | "previous">("next");
  const [state, setState] = useState<Record<string, CardState>>(() =>
    Object.fromEntries(
      passes.map((pass) => [
        pass.id,
        {
          code: pass.code,
          ask: pass.code && pass.unlockedOutcome === "none" ? "hidden" : null,
          busy: false,
          error: null,
        } satisfies CardState,
      ])
    )
  );

  const router = useRouter();
  const pending = useRef<string | null>(null);

  const patch = useCallback((id: string, next: Partial<CardState>) => {
    setState((previous) => ({ ...previous, [id]: { ...previous[id], ...next } }));
  }, []);

  // Waves open on a clock but nothing here runs a scheduler: the people wave 1 just
  // emailed are on this page, and their browsers are what turn the clock for the waves
  // behind them. A refresh follows so the newly opened wave sees its button.
  useEffect(() => {
    if (passes.length === 0) return;
    let stopped = false;
    async function advance() {
      const response = await fetch("/api/waves", { method: "POST" }).catch(() => null);
      if (!response?.ok || stopped) return;
      const data = await response.json().catch(() => ({}));
      if (data.opened) router.refresh();
    }
    void advance();
    const timer = window.setInterval(advance, 30000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [passes.length, router]);

  useEffect(() => {
    if (passes.length <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setDirection("next");
      setActiveIndex((current) => (current + 1) % passes.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [passes.length, paused]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const id = pending.current;
      if (!id) return;
      pending.current = null;
      const index = passes.findIndex((pass) => pass.id === id);
      if (index >= 0) setActiveIndex(index);
      setState((previous) =>
        previous[id]?.ask === "hidden"
          ? { ...previous, [id]: { ...previous[id], ask: "asking" } }
          : previous
      );
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [passes]);

  async function unlock(id: string) {
    patch(id, { busy: true, error: null });
    try {
      const response = await fetch(`/api/passes/${id}/unlock`, { method: "POST" });
      if (response.status === 401 || response.status === 403) {
        // No number, or their wave has not opened: the queue card is the answer.
        const data = await response.json().catch(() => ({}));
        track("join_prompted", { from: "unlock", reason: data.reason });
        patch(id, { busy: false, error: data.error ?? null });
        document.getElementById("join")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        track("unlock_failed", { status: response.status });
        throw new Error(data.error || "Something went wrong.");
      }

      track("pass_unlocked");
      patch(id, { code: data.code, ask: "hidden", busy: false });
      pending.current = id;
      window.open(data.url, "_blank", "noopener");
    } catch (error) {
      patch(id, { busy: false, error: error instanceof Error ? error.message : "Failed." });
    }
  }

  async function answer(id: string, result: Outcome) {
    track("pass_outcome", { result });
    patch(id, { ask: "done" });
    await fetch(`/api/passes/${id}/outcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    });
  }

  const pass = passes[activeIndex];
  const card = state[pass.id];

  function showPrevious() {
    setDirection("previous");
    setActiveIndex((current) => (current - 1 + passes.length) % passes.length);
  }

  function showNext() {
    setDirection("next");
    setActiveIndex((current) => (current + 1) % passes.length);
  }

  function showPass(index: number) {
    setDirection(index < activeIndex ? "previous" : "next");
    setActiveIndex(index);
  }

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div
        key={pass.id}
        className={`flex min-h-[190px] flex-col justify-between rounded-xl border border-line bg-paper px-4 py-4 ${
          direction === "previous" ? "pass-card-previous" : "pass-card-next"
        }`}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-mono text-[15px] break-all">
            claude.ai/referral/{card.code ?? pass.maskedCode}
          </span>
          <span className="text-[13px] text-muted">
            {`${pass.unlockCount} of ${unlocksPerPass} unlocked`} &middot; wave {pass.openWave}{" "}
            open &middot; listed{" "}
            {new Date(pass.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
          {card.error && <span className="text-[13px] text-bad">{card.error}</span>}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {myWave === null ? (
            <a
              href="#join"
              onClick={() => track("join_prompted", { from: "board" })}
              className="rounded-lg bg-accent px-4 py-2 text-[15px] font-semibold text-white hover:bg-accent-dark"
            >
              Take a number to unlock
            </a>
          ) : myWave > pass.openWave && !card.code ? (
            <span className="text-[15px] text-muted">
              Wave {pass.openWave} is unlocking. You are wave {myWave}
              {pass.nextWaveInSeconds <= 300 && (
                <> &middot; next wave in {Math.ceil(pass.nextWaveInSeconds / 60)} min</>
              )}
              .
            </span>
          ) : card.code ? (
            <>
              <a
                href={`https://claude.ai/referral/${card.code}`}
                target="_blank"
                rel="nofollow noopener"
                onClick={() => {
                  track("pass_opened");
                  if (state[pass.id].ask === "hidden") pending.current = pass.id;
                }}
                className="rounded-lg bg-good px-4 py-2 text-[15px] font-semibold text-white hover:brightness-90"
              >
                Open your pass &nearr;
              </a>
              {card.ask === "asking" && (
                <span className="outcome-pulse flex flex-wrap items-center gap-1.5 text-sm text-muted">
                  Did it work?
                  <button
                    onClick={() => answer(pass.id, "claimed")}
                    className="cursor-pointer rounded-md border border-line bg-surface px-2.5 py-0.5 text-[13px] hover:border-accent"
                  >
                    &#10003; Claimed it
                  </button>
                  <button
                    onClick={() => answer(pass.id, "dead")}
                    className="cursor-pointer rounded-md border border-line bg-surface px-2.5 py-0.5 text-[13px] hover:border-bad hover:text-bad"
                  >
                    &#10007; Didn&rsquo;t work
                  </button>
                </span>
              )}
              {card.ask === "done" && (
                <span className="text-sm text-good">Thanks - that keeps the board honest.</span>
              )}
            </>
          ) : (
            <button
              onClick={() => unlock(pass.id)}
              disabled={card.busy}
              className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-[15px] font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {card.busy ? "Unlocking..." : "Unlock this pass"}
            </button>
          )}
        </div>
      </div>

      {passes.length > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={showPrevious}
            aria-label="Show previous Claude pass"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line bg-paper text-lg hover:border-accent hover:text-accent-dark"
          >
            &larr;
          </button>
          <div className="flex items-center gap-2" aria-label={`Pass ${activeIndex + 1} of ${passes.length}`}>
            {passes.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => showPass(index)}
                aria-label={`Show pass ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className={`h-2.5 cursor-pointer rounded-full transition-all duration-300 ${
                  index === activeIndex ? "w-7 bg-accent" : "w-2.5 bg-line hover:bg-muted"
                }`}
              />
            ))}
            <span className="ml-1 rounded-full bg-[#f4e4da] px-2.5 py-0.5 text-[12px] font-semibold text-accent-dark" aria-live="polite">
              {activeIndex + 1} of {passes.length}
            </span>
          </div>
          <button
            type="button"
            onClick={showNext}
            aria-label="Show next Claude pass"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line bg-paper text-lg hover:border-accent hover:text-accent-dark"
          >
            &rarr;
          </button>
        </div>
      )}

      <p className="pt-4 text-sm text-muted">
        Each pass is offered to the queue in waves of ten, five minutes apart, and comes off the
        board after {unlocksPerPass} unlocks. A link can still run dry before the board knows;
        say so and you keep your place in the queue.
      </p>
    </div>
  );
}
